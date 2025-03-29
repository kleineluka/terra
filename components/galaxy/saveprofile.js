const { create } = require('xmlbuilder2');
const pretty = require('../utils/pretty.js');
const response = require('../utils/response.js');

function initializeProfileSave(socket, chunkCountString) {
    if (!socket) {
        pretty.error("initializeProfileSave called without a valid socket.", null);
        return false;
    }
    const chunksLeft = parseInt(chunkCountString, 10);
    let initialState = { chunksLeft: 0, saveData: "" }; // default to a safe state
    if (isNaN(chunksLeft) || chunksLeft <= 0) {
        pretty.error(`Invalid chunk count for profile save: ${chunkCountString}. Initializing with 0 chunks.`, null);
        socket.saveProfileState = initialState;
        pretty.print(`Invalid chunk count ${chunkCountString}. Save will likely fail.`, 'WARN');
        return true; // ondicate state was initialized, even if invalid count
    } else {
        initialState.chunksLeft = chunksLeft;
        socket.saveProfileState = initialState;
        pretty.print(`Initialized save state on socket ${socket.connectionID}. Expecting ${chunksLeft} chunk(s).`, 'DEBUG');
        return true; // we did it properly here
    }
}

async function saveProfileStartMiddleware(socket, commandInfo, next) {
    pretty.print(`Processing 'sp' (Save Profile Start) for Galaxy.`);
    if (!socket.userWristband || !socket.userWristband.id) {
        pretty.error("User not logged in for 'sp' (Save Profile Start).");
        return next(new Error("User not authenticated for sp"));
    }
    // extract chunk count
    if (commandInfo.parts.length < 2) {
        pretty.error(`Malformed 'sp' command for Galaxy. Expected chunk count.`);
        return next(new Error("Malformed 'sp' command: Missing chunk count"));
    }
    const chunkCountString = commandInfo.parts[1];
    try {
        const initSuccess = initializeProfileSave(socket, chunkCountString);
        // build response: <h7_0><rr /></h7_0>
        const responseXmlString = create()
            .ele('h7_0')
            .ele('rr') // "response received"
            .up()
            .end({ headless: true, prettyPrint: false });
        // format and send it
        const responseBuffer = response.formatStreamResponse(responseXmlString);
        socket.write(responseBuffer);
        pretty.print(`Sent 'rr' response for 'sp' (Save Profile Start).`);
        next();
    } catch (err) {
        pretty.error(`Unexpected error in 'sp' (Save Profile Start) middleware: ${err.message}`, err);
        next(err); 
    }
}

module.exports = {
    initializeProfileSave,
    saveProfileStartMiddleware,
};