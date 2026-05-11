const db = require('../server/database.js');
const pretty = require('../utils/pretty.js');
const response = require('../utils/response.js');
const { sendToUserByConnectionId } = require('../utils/connections.js');

async function deleteBuddyMiddleware(socket, commandInfo, next) {
    pretty.print(`Processing 'u_dbd' (Delete Buddy) command.`);
    if (!socket.userWristband || !socket.userWristband.id) {
        pretty.error("User not logged in for 'u_dbd' command.");
        return next(new Error("User not authenticated for u_dbd"));
    }
    const currentUser = socket.userWristband;
    const targetIdRaw = commandInfo.attrs.b;
    if (!targetIdRaw) {
        pretty.error("Malformed 'u_dbd' command: no buddy id provided.");
        socket.write(response.createResponseXml('u_dbd', { r: '1', u: currentUser.id.toString(), b: '' }));
        return next();
    }
    const targetId = parseInt(targetIdRaw, 10);
    if (isNaN(targetId)) {
        pretty.error(`Invalid buddy id for 'u_dbd': ${targetIdRaw}`);
        socket.write(response.createResponseXml('u_dbd', { r: '1', u: currentUser.id.toString(), b: targetIdRaw }));
        return next();
    }
    try {
        const [senderRow, targetUser] = await Promise.all([
            db.getQuery('SELECT friend_list FROM users WHERE id = ?', [currentUser.id]),
            db.getQuery('SELECT id, username, is_online, connection_id, friend_list FROM users WHERE id = ?', [targetId])
        ]);
        if (!targetUser) {
            pretty.print(`Target user ${targetId} not found for 'u_dbd'.`);
            socket.write(response.createResponseXml('u_dbd', { r: '1', u: currentUser.id.toString(), b: targetIdRaw }));
            return next();
        }
        // remove target from sender's friend list
        const senderList = senderRow?.friend_list
            ? senderRow.friend_list.split(',').filter(id => id.trim() !== '' && id.trim() !== targetId.toString())
            : [];
        await db.runQuery('UPDATE users SET friend_list = ? WHERE id = ?',
            [senderList.join(','), currentUser.id]);
        // remove sender from target's friend list
        const targetList = targetUser.friend_list
            ? targetUser.friend_list.split(',').filter(id => id.trim() !== '' && id.trim() !== currentUser.id.toString())
            : [];
        await db.runQuery('UPDATE users SET friend_list = ? WHERE id = ?',
            [targetList.join(','), targetId]);
        // notify the removed buddy if they are online
        if (targetUser.is_online === 1 && targetUser.connection_id) {
            sendToUserByConnectionId(targetUser.connection_id,
                response.createResponseXml('u_dbr', { n: currentUser.username, b: currentUser.id.toString() }));
            pretty.print(`Notified ${targetUser.username} they were removed as a buddy by ${currentUser.username}.`);
        }
        // confirm to sender
        socket.write(response.createResponseXml('u_dbd', {
            r: '0',
            u: currentUser.id.toString(),
            b: targetId.toString()
        }));
        pretty.print(`User ${currentUser.username} removed buddy ${targetUser.username}.`);
    } catch (err) {
        pretty.error(`Error in 'u_dbd' for user ${currentUser.id}: ${err.message}`, err);
        socket.write(response.createResponseXml('u_dbd', { r: '1', u: currentUser.id.toString(), b: targetIdRaw }));
    }
    next();
}

async function deleteBuddyResponseMiddleware(socket, commandInfo, next) {
    pretty.print(`Processing incoming 'u_dbr' (Delete Buddy Acknowledgment) command.`);
    if (!socket.userWristband || !socket.userWristband.id) {
        pretty.error("User not logged in for 'u_dbr' command.");
        return next(new Error("User not authenticated for u_dbr"));
    }
    const currentUser = socket.userWristband;
    const removedById = commandInfo.attrs.b;
    if (!removedById) {
        pretty.print(`Received 'u_dbr' without buddy id from ${currentUser.username}. Ignoring.`);
        return next();
    }
    // send u_dbd back so the client's deleteBuddy() handler fires and removes the entry from the UI
    socket.write(response.createResponseXml('u_dbd', {
        r: '0',
        u: currentUser.id.toString(),
        b: removedById
    }));
    pretty.print(`Confirmed buddy removal to ${currentUser.username}: removed user ${removedById}.`);
    next();
}

module.exports = {
    deleteBuddyMiddleware,
    deleteBuddyResponseMiddleware
};
