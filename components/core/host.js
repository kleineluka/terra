const response = require('./../utils/response.js');
const pretty = require('./../utils/pretty.js');

async function getHostDetails(commandInfo) {
    // get what kind of server it's requesting
    const [_, serverType] = commandInfo;
    // default values
    const serverID = "1";
    let xIPAddress = global.config_server.host || "localhost";
    let xPort = global.config_server.tcp_port.toString();
    let bIPAddress = global.config_server.host || "localhost";
    let bPort = global.config_server.tcp_port.toString();
    // adjust based on which server (for now they are all the same - perhaps the game hosted originally?)
    switch (serverType) {
        case "1": // User
        case "7": // Galaxy
        case "10": // Trunk
            xPort = global.config_server.tcp_port.toString();
            bPort = global.config_server.tcp_port.toString();
            break;
        default:
            break;
    }
    // build the xml
    return response.createResponseXml('a_gsd', {
        s: serverID,
        xi: xIPAddress,
        xp: xPort,
        bi: bIPAddress,
        bp: bPort
    });
}

async function hostDetailsMiddleware(socket, commandInfo, next) {
    pretty.print('Attempting to send host details to the client.');
    try {
        const responseXml = await getHostDetails(commandInfo.parts); // already formatted via response.createResponseXml
        socket.write(responseXml);
        next();
    } catch (err) {
        pretty.error('Error processing a_gsd: ' + err.message);
        socket.write(response.createResponseXml('a_gsd', { r: 1 }));
        next(err);
    }
}

module.exports = {
    getHostDetails,
    hostDetailsMiddleware
};