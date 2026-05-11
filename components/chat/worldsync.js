const chatManager = require('./manager.js');
const response = require('../utils/response.js');
const pretty = require('../utils/pretty.js');
const { buildAttrs } = require('../utils/xml.js');

// generic handler for world-sync events sent as standalone C2S commands: mv, od, pi, ri, ia, pl
async function worldSyncMiddleware(socket, commandInfo, next) {
    const tag = commandInfo.parts[0];
    pretty.print(`Processing '${tag}' (World Sync) command.`);
    if (!socket.userWristband || !socket.userWristband.id) {
        pretty.error(`User not logged in for '${tag}' command.`);
        return next(new Error(`User not authenticated for ${tag}`));
    }
    if (!socket.currentRoomId) {
        pretty.print(`User ${socket.userWristband.username} sent '${tag}' but is not in a room.`, 'WARN');
        return next();
    }
    const currentUser = socket.userWristband;
    const roomId = socket.currentRoomId;
    const pluginId = commandInfo.routing[1] || '2';
    const boardId  = commandInfo.routing[3] || '0';
    // stamp the sender's uid and merge with any client-supplied attrs
    const mergedAttrs = Object.assign({}, commandInfo.attrs, { id: currentUser.id.toString() });
    const attrStr = buildAttrs(mergedAttrs);
    const eventXml = attrStr ? `<${tag} ${attrStr} />` : `<${tag} />`;
    const broadcastXml = response.createChatResponseXml(tag, mergedAttrs, '', pluginId, boardId);
    chatManager.broadcastToRoom(roomId, broadcastXml, currentUser.id);
    pretty.print(`Broadcasted '${tag}' from ${currentUser.username} in room ${roomId}.`);
    next();
}

module.exports = {
    worldSyncMiddleware
};
