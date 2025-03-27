// imports
const ResponseBuilder = require('./../utils/response.js');
const pretty = require('./../utils/pretty.js');

// get the host details
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
            // If needed, handle unexpected server types here
            break;
    }

    // Build the XML response
    return ResponseBuilder.createResponseXml('a_gsd', {
        s: serverID,
        xi: xIPAddress,
        xp: xPort,
        bi: bIPAddress,
        bp: bPort
    });
}

// middleware for getting the host details
async function hostDetailsMiddleware(socket, commandInfo, next) {
    pretty.print('Attempting to send host details to the client.');
    try {
        // await the guest login response and send to client
        const responseXml = await getHostDetails(commandInfo.parts);
        console.log('Response XML:', responseXml);
        socket.write(responseXml);
        next();
    } catch (err) {
        // write an error message to the client
        pretty.error('Error processing a_gsd: ' + err.message);
        socket.write(ResponseBuilder.createResponseXml('a_gsd', { r: 1 })); // to-do: verify this is the correct error code (but as long as it isn't 1)
        next(err);
    }
}

// exports
module.exports = {
    getHostDetails,
    hostDetailsMiddleware
};