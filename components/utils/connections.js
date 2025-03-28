const crypto = require('crypto');
const pretty = require('../utils/pretty.js');
const response = require('../utils/response.js'); 

const activeConnections = new Map();

function registerConnection(socket) {
    const connectionID = crypto.randomUUID();
    socket.connectionID = connectionID;
    activeConnections.set(connectionID, socket);
    pretty.print(`Connection ${socket.remoteAddress}:${socket.remotePort} registered with ID: ${connectionID}`, 'DEBUG');
    return connectionID;
}

function unregisterConnection(socket) {
    if (socket.connectionID) {
        const deleted = activeConnections.delete(socket.connectionID);
        if (deleted) {
            pretty.print(`Connection ID ${socket.connectionID} unregistered.`, 'DEBUG');
        } else {
            pretty.print(`Attempted to unregister unknown connection ID ${socket.connectionID}.`, 'WARN');
        }
    } else {
        pretty.print(`Socket closed without a connectionID. (${socket.remoteAddress}:${socket.remotePort})`, 'WARN');
    }
}

function sendToUserByConnectionId(targetConnectionId, messageString) {
    const targetSocket = activeConnections.get(targetConnectionId);
    if (targetSocket) {
        try {
            const messageBuffer = response.formatStreamResponse(messageString);
            pretty.print(`Sending to ${targetConnectionId}: ${messageString}`, 'DEBUG');
            targetSocket.write(messageBuffer, (err) => {
                if (err) {
                    pretty.error(`Error writing to socket ${targetConnectionId}: ${err.message}`, err);
                    unregisterConnection(targetSocket);
                    targetSocket.destroy();
                }
            });
        } catch (formatError) {
            pretty.error(`Error formatting message for ${targetConnectionId}: ${formatError.message}`, formatError);
        }
    } else {
        pretty.print(`Cannot send message: Connection ID ${targetConnectionId} not found or inactive.`, 'WARN');
    }
}

module.exports = {
    registerConnection,
    unregisterConnection,
    sendToUserByConnectionId,
    getActiveConnectionsMap: () => activeConnections
};