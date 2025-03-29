const pretty = require('../utils/pretty.js');
const response = require('../utils/response.js'); 
const { saveProfileStartMiddleware: handleGalaxySaveProfileStart } = require('../galaxy/saveprofile.js');
// const { handleSoccerSP } = require('../games/soccer/sp.js');
// const { handlePoolSP } = require('./pool/sp.js');

async function handleSPMiddleware(socket, commandInfo, next) {
    pretty.print(`Handling conflicting 'sp' command.`);
    if (!socket.userWristband || !socket.userWristband.id) {
        pretty.error("User not logged in for 'sp' command.");
        return next(new Error("User not authenticated for sp"));
    }
    if (!commandInfo.routing || commandInfo.routing.length < 2) {
        pretty.error(`Malformed 'sp' command: Missing or incomplete routing string. Routing: ${commandInfo.routing?.join('|')}`);
        return next(new Error("Malformed 'sp' command: Missing routing info"));
    }
    const pluginId = commandInfo.routing[1];
    pretty.print(`'sp' command routed for Plugin ID: ${pluginId}`, 'DEBUG');
    try {
        switch (pluginId) {
            case '7': // galaxy
                pretty.print(`Routing 'sp' to Galaxy handler.`, 'DEBUG');
                await handleGalaxySaveProfileStart(socket, commandInfo, next);
                break;
            case '5':  // soccer
                pretty.error(`'sp' handler for Soccer (Plugin 5) not yet implemented.`);
                next(new Error("Soccer 'sp' handler not implemented"));
                break;
            case '6': // pool
                pretty.error(`'sp' handler for Pool (Plugin 6) not yet implemented.`);
                next(new Error("Pool 'sp' handler not implemented"));
                break;
            default: // should not get here
                pretty.error(`Unhandled 'sp' command for Plugin ID: ${pluginId}. Full command: ${commandInfo.fullCommand}`);
                next(new Error(`Unhandled 'sp' command for Plugin ID: ${pluginId}`));
                break;
        }
    } catch (err) {
        pretty.error(`Error executing specific 'sp' handler for Plugin ID ${pluginId}: ${err.message}`, err);
        next(err); // Pass the error to the main error handler
    }
    // call next in each individual handler, not here (!)
}

module.exports = {
    handleSPMiddleware,
};