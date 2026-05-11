const pretty = require('../utils/pretty.js');
const { joinChatMiddleware } = require('../chat/join.js');

async function handlejnMiddleware(socket, commandInfo, next) {
    pretty.print(`Handling conflicting 'jn' command.`);
    if (!socket.userWristband || !socket.userWristband.id) {
        pretty.error("User not logged in for 'jn' command.");
        return next(new Error("User not authenticated for jn"));
    }
    if (!commandInfo.routing || commandInfo.routing.length < 2) {
        pretty.error(`Incorrect 'jn' command: Missing or incomplete routing string. Routing: ${commandInfo.routing?.join('|')}`);
        return next(new Error("Incorrect 'jn' command: Missing routing info"));
    }
    const pluginId = commandInfo.routing[1];
    pretty.print(`'jn' command routed for Plugin ID: ${pluginId}`, 'DEBUG');
    try {
        switch (pluginId) {
            case '2': // chat
                pretty.print(`Routing 'jn' to Chat handler.`, 'DEBUG');
                await joinChatMiddleware(socket, commandInfo, next);
                break;
            default:
                pretty.error(`Unhandled 'jn' command for Plugin ID: ${pluginId}. Full command: ${commandInfo.fullCommand}`);
                next(new Error(`Unhandled 'jn' command for Plugin ID: ${pluginId}`));
                break;
        }
    } catch (err) {
        pretty.error(`Error executing specific 'jn' handler for Plugin ID ${pluginId}: ${err.message}`, err);
        next(err);
    }
    // call next in each individual handler, not here (!)
}

module.exports = {
    handlejnMiddleware,
};