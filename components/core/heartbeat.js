const pretty = require('../utils/pretty.js');
const response = require('../utils/response.js');
const { updateHeartbeat } = require('../utils/connections.js');

async function handleHeartbeat(connectionID) {
    updateHeartbeat(connectionID);
    const responseXml = response.createResponseXml('p', { t: "30" });
    return responseXml;
}

async function heartbeatMiddleware(socket, commandInfo, next) {
    if (!socket.connectionID) {
        pretty.error(`Received heartbeat from socket without a connectionID (${socket.remoteAddress}:${socket.remotePort}).. did the server restart while a player was connected?`, 'ERROR');
        return next(new Error("Missing connectionID on socket for heartbeat."));
    }
    try {
        const responseBuffer = await handleHeartbeat(socket.connectionID);
        socket.write(responseBuffer); // response was created with the format already, no need to format again
        pretty.print(`Heartbeat response sent to ${socket.connectionID}.`, 'DEBUG');
    } catch (err) {
        pretty.error(`Error processing heartbeat for ${socket.connectionID}: ${err.message}`, err);
        next(err); 
    }
}

module.exports = {
    handleHeartbeat,
    heartbeatMiddleware
};