const chatManager = require('./manager.js');
const response = require('../utils/response.js');
const pretty = require('../utils/pretty.js');
const { escapeXmlAttr } = require('../utils/xml.js');

// try and get a room to join
function resolveRoomToJoin(roomType, targetRoomId, currentUser) {
    if (targetRoomId) {
        const existingRoom = chatManager.getRoom(targetRoomId);
        if (existingRoom) {
            return targetRoomId;
        }
        // lobby joins might(?) send placeholder ids (e.g. 0) if no room exists
        // fallback to the shared lobby for the requested type
        const isLikelyCribJoin = roomType === '0' || targetRoomId.startsWith('crib_');
        if (isLikelyCribJoin) {
            return null;
        }
    }
    return chatManager.findOrCreateRoom(roomType, currentUser);
}

// handles both lobby joins and crib room joins, relies on resolveRoomToJoin to determine the appropriate room based on the command info and current user state
async function joinChatMiddleware(socket, commandInfo, next) {
    pretty.print(`Processing 'jn' (Join Chat) command.`);
    // only handle chat plugin (plugin ID 2), let other middleware handle game joins
    const pluginId = commandInfo.routing[1] || '2';
    const boardId = commandInfo.routing[3] || '0';
    if (pluginId !== '2') {
        return next();
    }
    if (!socket.userWristband || !socket.userWristband.id) {
        pretty.error("User not logged in for 'jn' command.");
        return next(new Error("User not authenticated for jn"));
    }
    const currentUser = socket.userWristband;
    // extract top-level <jn> attributes
    const roomType = commandInfo.attrs.t || '2';
    const targetRoomId = (commandInfo.attrs.id || '').trim() || null;
    // extract nested <pr> attributes
    const prAttrs = commandInfo.childAttrs.pr?.[0] || {};
    const funkeyId = prAttrs.f || 'unknown';
    const dl = prAttrs.dl || '0| | ';
    // store funkeyId/dl on the user object for future reference (e.g. in messages)
    currentUser.bitty = funkeyId;
    currentUser.dl = dl;
    // find or create a valid target room for this join request
    const roomIdToJoin = resolveRoomToJoin(roomType, targetRoomId, currentUser);
    if (!roomIdToJoin) {
        pretty.error(`Could not resolve a room for join request. Type: ${roomType}, target: ${targetRoomId}`);
        socket.write(response.createChatResponseXml('jn', { r: '1' }, '', pluginId, boardId));
        return next();
    }
    // if the user is already in another room, remove them from that room first
    if (socket.currentRoomId && socket.currentRoomId !== roomIdToJoin) {
        chatManager.removeUserFromRoom(socket.currentRoomId, currentUser.id, false);
        socket.currentRoomId = null;
    }
    // add the user to the new room
    const presenceBoardId = roomIdToJoin;
    const userObjectForRoom = {
        userId: currentUser.id,
        username: currentUser.username,
        connectionId: socket.connectionID,
        bitty: currentUser.bitty,
        dl: currentUser.dl,
        pluginId,
        boardId: presenceBoardId
    };
    const joined = chatManager.addUserToRoom(roomIdToJoin, userObjectForRoom, socket);
    if (!joined) {
        pretty.error(`Failed to add user ${currentUser.username} to room ${roomIdToJoin}.`);
        socket.write(response.createChatResponseXml('jn', { r: '1' }, '', pluginId, boardId));
        return next();
    }
    // update socket state to reflect new room and plugin/board context
    socket.chatPluginId = pluginId;
    socket.chatBoardId = presenceBoardId;
    // send join confirmation to the joining client
    socket.write(response.createChatResponseXml('jn', { r: '0', id: roomIdToJoin }, '', pluginId, boardId));
    // send the current player list to the joining client
    const usersInRoom = chatManager.getUsersInRoom(roomIdToJoin);
    const usersToAnnounceOnline = [];
    let playersXml = '';
    if (usersInRoom) {
        usersInRoom.forEach(player => {
            playersXml += `<pr f="${escapeXmlAttr(player.bitty)}" uid="${escapeXmlAttr(player.userId)}" n="${escapeXmlAttr(player.username)}" dl="${escapeXmlAttr(player.dl)}" />`;
            if (player.userId !== currentUser.id) {
                usersToAnnounceOnline.push(player.userId);
            }
        });
    }
    // presence packets are sent on the room board/channel so clients can render funkeys in game
    socket.write(response.createChatResponseXml('pj', {}, playersXml, pluginId, presenceBoardId));
    socket.write(response.createChatResponseXml('cp', {}, playersXml, pluginId, presenceBoardId));
    // the client expects explicit online notifications as separate events
    usersToAnnounceOnline.forEach((onlineUserId) => {
        socket.write(response.createChatResponseXml('on', { id: onlineUserId.toString() }, '', pluginId, presenceBoardId));
    });
    pretty.print(`User ${currentUser.username} joined room ${roomIdToJoin}.`);
    next();
}

module.exports = {
    joinChatMiddleware
};
