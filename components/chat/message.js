const chatManager = require('./manager.js');
const response = require('../utils/response.js');
const pretty = require('../utils/pretty.js');
const { sendToUserByConnectionId } = require('../utils/connections.js');

async function sendMessageMiddleware(socket, commandInfo, next) {
    pretty.print(`Processing 'ms' (Send Message) command.`);
    if (!socket.userWristband || !socket.userWristband.id) {
        pretty.error("User not logged in for 'ms' command.");
        return next(new Error("User not authenticated for ms"));
    }
    if (!socket.currentRoomId) {
        pretty.print(`User ${socket.userWristband.username} sent 'ms' but is not in a chat room, skipping...`, 'WARN');
        return next();
    }
    const currentUser = socket.userWristband;
    const roomId = socket.currentRoomId;
    // extract message text from structured attrs first, fallback to legacy parsing.
    const messageContent = commandInfo.attrs.m ?? commandInfo.parts[1];
    if (messageContent === undefined || messageContent === null) {
        pretty.error(`Malformed 'ms' command received. Attrs: ${JSON.stringify(commandInfo.attrs)}`);
        return next(new Error("Malformed ms command"));
    }
    const pluginId = commandInfo.routing[1] || socket.chatPluginId || '2';
    const boardId = commandInfo.routing[3] || socket.chatBoardId || '0';
    socket.chatPluginId = pluginId;
    socket.chatBoardId = boardId;
    // to-do: validate message content (length, disallowed characters, etc.) before broadcasting
    // prepare message format in S2C format: <ms n="SenderName" m="Message" />
    const messageXml = response.createChatResponseXml('ms', {
        n: currentUser.username,
        m: messageContent
    }, '', pluginId, boardId);
    // broadcast to everyone (incl sender)
    chatManager.broadcastToRoom(roomId, messageXml, currentUser.id);
    sendToUserByConnectionId(socket.connectionID, messageXml);
    pretty.print(`User ${currentUser.username} sent message "${messageContent}" to room ${roomId}.`);
    next();
}

module.exports = {
    sendMessageMiddleware
};