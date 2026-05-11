const chatManager = require('./manager.js');
const response = require('../utils/response.js');
const pretty = require('../utils/pretty.js');

// sanity wrapper for config, not really needed but.. better safe than sorry?
function getMaxCribGuests() {
    const configured = Number(global.config_social?.crib_max_guests);
    if (Number.isInteger(configured) && configured > 0) {
        return configured;
    }
    return 6;
}

// middleware for handling the 'cr' (Create Room) command
async function createRoomMiddleware(socket, commandInfo, next) {
    pretty.print(`Processing 'cr' (Create Room) command.`);
    if (!socket.userWristband || !socket.userWristband.id) {
        pretty.error("User not logged in for 'cr' command.");
        return next(new Error("User not authenticated for cr"));
    }
    // get data from command and socket
    const currentUser = socket.userWristband;
    const roomType = commandInfo.attrs.t || '0';
    const pluginId = commandInfo.routing[1] || '2';
    const boardId = commandInfo.routing[3] || '0';
    // create a new crib room owned by this user
    const roomId = chatManager.findOrCreateRoom('crib', currentUser);
    if (!roomId) {
        pretty.error(`Could not create crib room for ${currentUser.username}.`);
        return next(new Error("Failed to create crib room"));
    }
    // add the host to their own room
    const prAttrs = commandInfo.childAttrs.pr?.[0] || {};
    const funkeyId = prAttrs.f || currentUser.bitty || 'unknown';
    const dl = prAttrs.dl || currentUser.dl || '0| | ';
    currentUser.bitty = funkeyId;
    currentUser.dl = dl;
    // add the user to the room's user list and track their plugin/board for future messages
    chatManager.addUserToRoom(roomId, {
        userId: currentUser.id,
        username: currentUser.username,
        connectionId: socket.connectionID,
        bitty: funkeyId,
        dl,
        pluginId,
        boardId
    }, socket);
    // update socket state to reflect new room and plugin/board context
    socket.chatPluginId = pluginId;
    socket.chatBoardId = boardId;
    // respond with the room creation confirmation
    socket.write(response.createChatResponseXml('cr', { mx: getMaxCribGuests().toString(), id: roomId }, '', pluginId, boardId));
    pretty.print(`User ${currentUser.username} created room ${roomId}.`);
    next();
}

module.exports = {
    createRoomMiddleware
};
