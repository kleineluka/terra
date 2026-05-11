const chatManager = require('./manager.js');
const response = require('../utils/response.js');
const pretty = require('../utils/pretty.js');
const { sendToUserByConnectionId } = require('../utils/connections.js');

// logic for leaving a chat, used in other disconnection scenarios as well beyond lv
function handleLeaveChat(socket, disconnected = false) {
    if (!socket || !socket.userWristband || !socket.userWristband.id || !socket.currentRoomId) {
        pretty.print(`Attempted handleLeaveChat for socket without user/room info.`, 'WARN');
        return;
    }
    const userId = socket.userWristband.id;
    const roomId = socket.currentRoomId;
    const username = socket.userWristband.username || 'Unknown';
    pretty.print(`User ${username} (ID: ${userId}) leaving room ${roomId}${disconnected ? ' (disconnect)' : ''}.`);
    const leavingUser = chatManager.removeUserFromRoom(roomId, userId, disconnected);
    socket.currentRoomId = null;
    if (!leavingUser) {
        pretty.print(`User ${userId} was not found in room ${roomId} upon trying to leave.`, 'WARN');
    }
}

// middleware for handling the 'lv' (Leave Chat) command
async function leaveChatMiddleware(socket, commandInfo, next) {
    pretty.print(`Processing 'lv' (Leave Chat) command.`);
    // basic validation
    if (!socket.userWristband || !socket.userWristband.id) {
        pretty.error("User not logged in for 'lv' command.");
        return next(new Error("User not authenticated for lv"));
    }
    if (!socket.currentRoomId) {
        pretty.print(`User ${socket.userWristband.username} sent 'lv' but is not in a room.`, 'WARN');
        return next(); // nothing to leave
    }
    handleLeaveChat(socket);
    next(); // no response necessary
}

module.exports = {
    leaveChatMiddleware,
    handleLeaveChat
};