const db = require('../server/database.js');
const pretty = require('../utils/pretty.js');
const response = require('../utils/response.js');
const { sendToUserByConnectionId } = require('../utils/connections.js');

const REQUEST_TTL_MS = 5 * 60 * 1000; // 5 minutes

// pending buddy requests: Map<targetUserId, { fromId, fromUsername, fromConnectionId, timer }>
const pendingRequests = new Map();

function expireRequest(targetUserId) {
    const pending = pendingRequests.get(targetUserId);
    if (!pending) return;
    pendingRequests.delete(targetUserId);
    pretty.print(`Buddy request from ${pending.fromUsername} to user ${targetUserId} expired.`, 'DEBUG');
}

async function addBuddyMiddleware(socket, commandInfo, next) {
    pretty.print(`Processing 'u_abd' (Add Buddy Request) command.`);
    if (!socket.userWristband || !socket.userWristband.id) {
        pretty.error("User not logged in for 'u_abd' command.");
        return next(new Error("User not authenticated for u_abd"));
    }
    const currentUser = socket.userWristband;
    const targetName = commandInfo.attrs.n;
    const targetIdRaw = commandInfo.attrs.b;
    if (!targetName && !targetIdRaw) {
        pretty.error("Malformed 'u_abd' command: no target name or id provided.");
        socket.write(response.createResponseXml('u_abd', { r: '1' }));
        return next();
    }
    try {
        // look up the target user
        let targetUser;
        if (targetIdRaw) {
            targetUser = await db.getQuery(
                'SELECT id, username, is_online, connection_id FROM users WHERE id = ?',
                [parseInt(targetIdRaw, 10)]
            );
        } else {
            targetUser = await db.getQuery(
                'SELECT id, username, is_online, connection_id FROM users WHERE username = ?',
                [targetName]
            );
        }
        if (!targetUser) {
            pretty.print(`Target user "${targetName ?? targetIdRaw}" not found for 'u_abd'.`);
            socket.write(response.createResponseXml('u_abd', { r: '1' }));
            return next();
        }
        if (targetUser.id === currentUser.id) {
            pretty.print(`User ${currentUser.username} tried to add themselves as a buddy.`);
            socket.write(response.createResponseXml('u_abd', { r: '1' }));
            return next();
        }
        // check if already friends
        const senderRow = await db.getQuery('SELECT friend_list FROM users WHERE id = ?', [currentUser.id]);
        const friendList = senderRow?.friend_list
            ? senderRow.friend_list.split(',').filter(id => id.trim() !== '')
            : [];
        if (friendList.includes(targetUser.id.toString())) {
            pretty.print(`User ${currentUser.username} is already friends with ${targetUser.username}.`);
            socket.write(response.createResponseXml('u_abd', { r: '1' }));
            return next();
        }
        // cancel any existing pending request from this user to the same target
        const existing = pendingRequests.get(targetUser.id);
        if (existing) clearTimeout(existing.timer);

        // store the pending request so u_abr can finalize it, with a TTL
        const timer = setTimeout(() => expireRequest(targetUser.id), REQUEST_TTL_MS);
        pendingRequests.set(targetUser.id, {
            fromId: currentUser.id,
            fromUsername: currentUser.username,
            fromConnectionId: socket.connectionID,
            timer
        });
        // notify the target if they are online
        if (targetUser.is_online === 1 && targetUser.connection_id) {
            const requestXml = response.createResponseXml('u_abr', {
                b: currentUser.id.toString(),
                n: currentUser.username
            });
            sendToUserByConnectionId(targetUser.connection_id, requestXml);
            pretty.print(`Sent buddy request from ${currentUser.username} to ${targetUser.username}.`);
        } else {
            pretty.print(`Target ${targetUser.username} is offline; buddy request will be pending.`);
        }
    } catch (err) {
        pretty.error(`Error in 'u_abd' for user ${currentUser.id}: ${err.message}`, err);
        socket.write(response.createResponseXml('u_abd', { r: '1' }));
    }
    next();
}

async function addBuddyResponseMiddleware(socket, commandInfo, next) {
    pretty.print(`Processing 'u_abr' (Add Buddy Response) command.`);
    if (!socket.userWristband || !socket.userWristband.id) {
        pretty.error("User not logged in for 'u_abr' command.");
        return next(new Error("User not authenticated for u_abr"));
    }
    const currentUser = socket.userWristband;
    const accepted = commandInfo.attrs.r === '1';
    const pending = pendingRequests.get(currentUser.id);
    if (!pending) {
        pretty.print(`No pending buddy request found for user ${currentUser.username}.`);
        return next();
    }
    clearTimeout(pending.timer);
    pendingRequests.delete(currentUser.id);
    if (!accepted) {
        pretty.print(`User ${currentUser.username} declined buddy request from ${pending.fromUsername}.`);
        return next();
    }
    try {
        // add each user to the other's friend list
        const [senderRow, targetRow] = await Promise.all([
            db.getQuery('SELECT friend_list FROM users WHERE id = ?', [pending.fromId]),
            db.getQuery('SELECT friend_list, is_online, chat_status, phone_status, connection_id FROM users WHERE id = ?', [currentUser.id])
        ]);
        const senderList = senderRow?.friend_list
            ? senderRow.friend_list.split(',').filter(id => id.trim() !== '')
            : [];
        const targetList = targetRow?.friend_list
            ? targetRow.friend_list.split(',').filter(id => id.trim() !== '')
            : [];
        if (!senderList.includes(currentUser.id.toString())) {
            await db.runQuery('UPDATE users SET friend_list = ? WHERE id = ?',
                [[...senderList, currentUser.id.toString()].join(','), pending.fromId]);
        }
        if (!targetList.includes(pending.fromId.toString())) {
            await db.runQuery('UPDATE users SET friend_list = ? WHERE id = ?',
                [[...targetList, pending.fromId.toString()].join(','), currentUser.id]);
        }
        // confirm to the original sender
        sendToUserByConnectionId(pending.fromConnectionId, response.createResponseXml('u_abd', {
            r: '0',
            n: currentUser.username,
            b: currentUser.id.toString(),
            o: (targetRow?.is_online ?? 0).toString(),
            s: (targetRow?.chat_status ?? 0).toString(),
            ph: (targetRow?.phone_status ?? 0).toString(),
            a: '0', bf: '0', cf: '0'
        }));
        // confirm to the acceptor
        const fromUser = await db.getQuery(
            'SELECT is_online, chat_status, phone_status FROM users WHERE id = ?',
            [pending.fromId]
        );
        socket.write(response.createResponseXml('u_abd', {
            r: '0',
            n: pending.fromUsername,
            b: pending.fromId.toString(),
            o: (fromUser?.is_online ?? 0).toString(),
            s: (fromUser?.chat_status ?? 0).toString(),
            ph: (fromUser?.phone_status ?? 0).toString(),
            a: '0', bf: '0', cf: '0'
        }));
        pretty.print(`Buddy request accepted: ${currentUser.username} <-> ${pending.fromUsername}.`);
    } catch (err) {
        pretty.error(`Error in 'u_abr' for user ${currentUser.id}: ${err.message}`, err);
    }
    next();
}

module.exports = {
    addBuddyMiddleware,
    addBuddyResponseMiddleware
};
