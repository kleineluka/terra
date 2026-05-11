const pretty = require('../utils/pretty.js');
const { sendToUserByConnectionId } = require('../utils/connections.js');
const response = require('../utils/response.js');
const { escapeXmlAttr } = require('../utils/xml.js');

// volatile storage for chat rooms and their users
// Map<roomId, { type: string, users: Map<userId, userObject>, hostId: userId | null }>
const activeRooms = new Map();

function getUserRouting(user) {
    return {
        pluginId: user?.pluginId ? String(user.pluginId) : '2',
        boardId: user?.boardId ? String(user.boardId) : '0'
    };
}

function sendChatToUser(user, command, attributes = {}, innerXml = '', boardIdOverride = null) {
    if (!user || !user.connectionId) {
        return;
    }

    const { pluginId, boardId } = getUserRouting(user);
    const targetBoardId = boardIdOverride || boardId;
    const message = response.createChatResponseXml(command, attributes, innerXml, pluginId, targetBoardId);
    sendToUserByConnectionId(user.connectionId, message);
}


function findOrCreateRoom(type, creatingUser) {
    if (type === 'crib') {
        const roomId = `crib_${creatingUser.id}`;
        if (!activeRooms.has(roomId)) {
            pretty.print(`Creating crib room (ID: ${roomId}) for host ${creatingUser.id}.`);
            activeRooms.set(roomId, { type: 'crib', users: new Map(), hostId: creatingUser.id });
        }
        return roomId;
    }
    // all numeric types get a shared lobby keyed by type number
    const lobbyId = `lobby_${type}`;
    if (!activeRooms.has(lobbyId)) {
        pretty.print(`Creating lobby (ID: ${lobbyId}) for room type ${type}.`);
        activeRooms.set(lobbyId, { type, users: new Map(), hostId: null });
    }
    return lobbyId;
}


function addUserToRoom(roomId, user, socket) {
    const room = activeRooms.get(roomId);
    if (!room) {
        pretty.error(`Attempted to add user to non-existent room: ${roomId}`, null);
        return false;
    }
    const existingUser = room.users.get(user.userId);
    room.users.set(user.userId, existingUser ? { ...existingUser, ...user } : user);
    socket.currentRoomId = roomId;
    socket.chatPluginId = user.pluginId || socket.chatPluginId || '2';
    socket.chatBoardId = user.boardId || socket.chatBoardId || '0';
    if (!existingUser) {
        pretty.print(`User ${user.username} (ID: ${user.userId}) added to room ${roomId}.`);
        broadcastUserJoin(roomId, user);
    } else {
        pretty.print(`User ${user.username} (ID: ${user.userId}) is already in room ${roomId}; refreshed room metadata.`, 'WARN');
    }
    return true;
}

function removeUserFromRoom(roomId, userId, disconnected = false) {
    const room = activeRooms.get(roomId);
    if (room && room.users.has(userId)) {
        const leavingUser = room.users.get(userId);
        room.users.delete(userId);
        pretty.print(`User ${leavingUser?.username || 'Unknown'} (ID: ${userId}) removed from room ${roomId}.`);

        // Notify remaining users
        broadcastUserLeave(roomId, userId, disconnected);

        // Check if room is now empty and should be deleted
        if (room.users.size === 0 && !roomId.startsWith('lobby_')) {
            if (room.hostId === userId) {
                pretty.print(`Host ${userId} left crib room ${roomId}. Closing room.`);
                kickAllUsersFromRoom(roomId, userId);
                activeRooms.delete(roomId);
                pretty.print(`Room ${roomId} deleted.`);
            } else if (!roomId.startsWith('crib_')) {
                activeRooms.delete(roomId);
                pretty.print(`Room ${roomId} deleted as it is empty.`);
            }
        }
        return leavingUser; // Return the user who left
    } else {
        pretty.print(`User ${userId} not found in room ${roomId} or room doesn't exist.`, 'WARN');
        return null;
    }
}

/**
 * Kicks all users from a room, typically when the host leaves.
 * @param {string} roomId - The ID of the room.
 * @param {number} leavingHostId - The ID of the host who is leaving.
 */
function kickAllUsersFromRoom(roomId, leavingHostId) {
    const room = activeRooms.get(roomId);
    if (!room) return;

    pretty.print(`Kicking all users from room ${roomId} due to host ${leavingHostId} leaving.`);

    room.users.forEach(user => {
        if (user.userId !== leavingHostId) { // Don't send to the host leaving
            sendChatToUser(user, 'cd', { id: leavingHostId.toString() }, '', roomId);
            // Find the socket associated with this user ID to clear their room state
            const targetSocket = findSocketByUserId(user.userId);
            if (targetSocket) {
                targetSocket.currentRoomId = null;
            }
            pretty.print(`Sent kick notification to user ${user.userId} in room ${roomId}.`);
        }
    });
    // Clear the user list after notifying everyone
    room.users.clear();
}


/**
 * Retrieves the raw room object.
 * @param {string} roomId
 * @returns {{ type: string, users: Map, hostId: number|null } | undefined}
 */
function getRoom(roomId) {
    return activeRooms.get(roomId);
}

function findUserRoomId(userId) {
    for (const [roomId, room] of activeRooms.entries()) {
        if (room.users.has(userId)) {
            return roomId;
        }
    }
    return null;
}

function getUsersInRoom(roomId) {
    const room = activeRooms.get(roomId);
    return room ? room.users : null;
}

function broadcastToRoom(roomId, messageXml, senderUserId) {
    const users = getUsersInRoom(roomId);
    if (users) {
        users.forEach(user => {
            if (user.userId !== senderUserId) {
                sendToUserByConnectionId(user.connectionId, messageXml);
            }
        });
    }
}

function broadcastUserJoin(roomId, joiningUser) {
    const room = activeRooms.get(roomId);
    if (!room) {
        return;
    }
    const prXml = `<pr f="${escapeXmlAttr(joiningUser.bitty)}" uid="${escapeXmlAttr(joiningUser.userId)}" n="${escapeXmlAttr(joiningUser.username)}" dl="${escapeXmlAttr(joiningUser.dl)}" />`;
    room.users.forEach(user => {
        if (user.userId === joiningUser.userId) {
            return;
        }
        sendChatToUser(user, 'pj', {}, prXml, roomId);
        sendChatToUser(user, 'cp', {}, prXml, roomId);
        sendChatToUser(user, 'on', { id: joiningUser.userId.toString() }, '', roomId);
    });
    pretty.print(`Broadcasted join notification for ${joiningUser.username} in room ${roomId}.`);
}

function broadcastUserLeave(roomId, leavingUserId, disconnected = false) {
    const room = activeRooms.get(roomId);
    if (!room) {
        return;
    }
    const tag = disconnected ? 'of' : 'pd';
    room.users.forEach(user => {
        if (user.userId === leavingUserId) {
            return;
        }
        sendChatToUser(user, tag, { id: leavingUserId.toString() }, '', roomId);
    });
    pretty.print(`Broadcasted ${tag} for user ${leavingUserId} in room ${roomId}.`);
}

function findSocketByUserId(userId) {
    const connections = require('../utils/connections.js').getActiveConnectionsMap();
    for (const socket of connections.values()) {
        if (socket.userWristband && socket.userWristband.id === userId) {
            return socket;
        }
    }
    return null;
}

module.exports = {
    findOrCreateRoom,
    addUserToRoom,
    removeUserFromRoom,
    getRoom,
    findUserRoomId,
    getUsersInRoom,
    broadcastToRoom,
    broadcastUserJoin,
    broadcastUserLeave,
    kickAllUsersFromRoom,
    findSocketByUserId
};