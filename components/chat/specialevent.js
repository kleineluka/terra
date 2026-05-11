const chatManager = require('./manager.js');
const response = require('../utils/response.js');
const pretty = require('../utils/pretty.js');
const { sendToUserByConnectionId } = require('../utils/connections.js');

async function sendSpecialEventMiddleware(socket, commandInfo, next) {
    pretty.print(`Processing 'se' (Special Event) command.`);
    if (!socket.userWristband || !socket.userWristband.id) {
        pretty.error("User not logged in for 'se' command.");
        return next(new Error("User not authenticated for se"));
    }
    if (!socket.currentRoomId) {
        pretty.error(`User ${socket.userWristband.username} tried to send special event but is not in a room.`);
        return next();
    }
    const currentUser = socket.userWristband;
    const roomId = socket.currentRoomId;
    let specialEventXml = commandInfo.fullCommand;
    // basic validation to ensure it looks like an <se> tag with content
    if (!specialEventXml || !specialEventXml.trim().startsWith('<se')) {
        pretty.error(`Malformed 'se' command payload: ${specialEventXml}`);
        return next(new Error("Malformed se command payload"));
    }
    // attempt to isolate just the <se> tag and its content if routing info is appended
    if (specialEventXml.includes('#')) {
        specialEventXml = specialEventXml.substring(0, specialEventXml.lastIndexOf('>') + 1);
    }
    // ensure it's a valid SE tag
    if (!specialEventXml.endsWith('</se>')) {
        // handle self-closing tags like <se ... />
        if (!specialEventXml.endsWith('/>')) {
            pretty.error(`Invalid 'se' tag structure: ${specialEventXml}`);
            return next(new Error("Invalid se tag structure"));
        }
    }
    // wrap in h{PID}_{BID} using actual routing values
    const pluginId = commandInfo.routing[1] || '2';
    const boardId  = commandInfo.routing[3] || '0';
    const broadcastXml = response.createChatResponseXml(null, {}, specialEventXml, pluginId, boardId);
    // broadcast to all other users in the room (sender already handled locally)
    chatManager.broadcastToRoom(roomId, broadcastXml, currentUser.id);
    pretty.print(`User ${currentUser.username} sent special event to room ${roomId}: ${specialEventXml}`);
    next();
}

module.exports = {
    sendSpecialEventMiddleware
};