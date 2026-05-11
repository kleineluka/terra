const chatManager = require('./manager.js');
const response = require('../utils/response.js');
const pretty = require('../utils/pretty.js');
const { sendToUserByConnectionId } = require('../utils/connections.js');
const { escapeXmlAttr } = require('../utils/xml.js');

async function changePropertiesMiddleware(socket, commandInfo, next) {
    pretty.print(`Processing 'cp' (Change Properties) command.`);
    if (!socket.userWristband || !socket.userWristband.id) {
        pretty.error("User not logged in for 'cp' command.");
        return next(new Error('User not authenticated for cp'));
    }
    const currentUser = socket.userWristband;
    const roomId = socket.currentRoomId || commandInfo.attrs.id;
    if (!roomId) {
        pretty.print(`User ${currentUser.username} sent 'cp' without a room context.`, 'WARN');
        return next();
    }
    const usersInRoom = chatManager.getUsersInRoom(roomId);
    if (!usersInRoom || !usersInRoom.has(currentUser.id)) {
        pretty.print(`User ${currentUser.username} sent 'cp' for room ${roomId} but is not tracked in that room.`, 'WARN');
        return next();
    }
    const roomUser = usersInRoom.get(currentUser.id);
    const prAttrs = commandInfo.childAttrs.pr?.[0] || {};
    const funkeyId = prAttrs.f || roomUser.bitty || currentUser.bitty || 'unknown';
    const dl = prAttrs.dl || roomUser.dl || currentUser.dl || '0| | ';
    currentUser.bitty = funkeyId;
    currentUser.dl = dl;
    roomUser.bitty = funkeyId;
    roomUser.dl = dl;
    const pluginId = commandInfo.routing[1] || socket.chatPluginId || '2';
    const boardId = roomId;
    socket.chatPluginId = pluginId;
    socket.chatBoardId = boardId;
    roomUser.pluginId = pluginId;
    roomUser.boardId = boardId;
    const prXml = `<pr f="${escapeXmlAttr(funkeyId)}" uid="${escapeXmlAttr(currentUser.id)}" n="${escapeXmlAttr(currentUser.username)}" dl="${escapeXmlAttr(dl)}" />`;
    const cpXml = response.createChatResponseXml('cp', {}, prXml, pluginId, boardId);
    chatManager.broadcastToRoom(roomId, cpXml, currentUser.id);
    sendToUserByConnectionId(socket.connectionID, cpXml);
    pretty.print(`Broadcasted 'cp' for ${currentUser.username} in room ${roomId}.`);
    next();
}

module.exports = {
    changePropertiesMiddleware
};
