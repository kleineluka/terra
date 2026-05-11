const chatManager = require('./manager.js');
const response = require('../utils/response.js');
const pretty = require('../utils/pretty.js');
const { sendToUserByConnectionId } = require('../utils/connections.js');

// middleware for handling the 'ko' (Kick Out) command
async function kickFromCribMiddleware(socket, commandInfo, next) {
    pretty.print(`Processing 'ko' (Kick Out) command.`);
    if (!socket.userWristband || !socket.userWristband.id) {
        pretty.error("User not logged in for 'ko' command.");
        return next(new Error("User not authenticated for ko"));
    }
    const currentUser = socket.userWristband;
    const roomId = socket.currentRoomId;
    if (!roomId) {
        pretty.print(`User ${currentUser.username} sent 'ko' but is not in a room.`, 'WARN');
        return next();
    }
    // only the room host may kick
    const room = chatManager.getRoom(roomId);
    if (!room || room.hostId !== currentUser.id) {
        pretty.print(`User ${currentUser.username} tried to kick but is not the host of room ${roomId}.`, 'WARN');
        return next();
    }
    // target user id comes from the 'u' attribute
    const targetUserId = commandInfo.attrs.u;
    if (!targetUserId) {
        pretty.error("'ko' command missing 'u' attribute.");
        return next(new Error("ko missing target user id"));
    }
    // verify the target user is actually in the room
    const targetUser = chatManager.getUsersInRoom(roomId)?.get(Number(targetUserId));
    if (!targetUser) {
        pretty.print(`Target user ${targetUserId} not found in room ${roomId}.`, 'WARN');
        return next();
    }
    // notify the kicked user
    sendToUserByConnectionId(
        targetUser.connectionId,
        response.createChatResponseXml(
            'ko',
            { id: targetUserId.toString() },
            '',
            targetUser.pluginId || '2',
            roomId
        )
    );
    // remove them from the room
    const targetSocket = chatManager.findSocketByUserId(Number(targetUserId));
    chatManager.removeUserFromRoom(roomId, Number(targetUserId), false);
    if (targetSocket) targetSocket.currentRoomId = null;
    pretty.print(`User ${currentUser.username} kicked user ${targetUserId} from room ${roomId}.`);
    next();
}

module.exports = {
    kickFromCribMiddleware
};
