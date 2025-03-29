const fs = require('fs').promises;
const path = require('path');
const { create } = require('xmlbuilder2');
const { parseStringPromise } = require('xml2js');
const { decode } = require('html-entities'); 
const response = require('../utils/response.js');
const pretty = require('../utils/pretty.js');

async function handleSaveProfilePart(socket, commandInfo) {
    const [_, v, n] = commandInfo.parts; // v = value (chunk data), n = chunk number (unused)
    if (!socket.userWristband || !socket.userWristband.username) {
        pretty.error("User not logged in for 'spp' command.");
        return;
    }
    const username = socket.userWristband.username;
    if (!socket.saveProfileState || typeof socket.saveProfileState.chunksLeft !== 'number') {
        pretty.error(`Received 'spp' for user ${username} but no save state initialized (sp command likely missed or failed).`, null);
        return;
    }
    // prepend the chunk data to the existing saveData
    socket.saveProfileState.saveData = v + socket.saveProfileState.saveData;
    pretty.print(`Received chunk ${n} for ${username}. ${socket.saveProfileState.chunksLeft - 1} chunks remaining.`, 'DEBUG');
    // if it is the last chunk
    if (socket.saveProfileState.chunksLeft === 1) {
        pretty.print(`Processing final profile chunk for user ${username}.`);
        let responseXmlString = '';
        try {
            // decode HTML entities and parse the XML
            const decodedData = decode(socket.saveProfileState.saveData);
            const parsedData = await parseStringPromise(decodedData);
            // get sid
            const currentSid = parsedData.profile?.$?.sid;
            const profileNameFromXML = parsedData.profile?.$?.gname; 
            if (!profileNameFromXML) {
                pretty.error(`Profile XML for ${username} is missing 'gname' attribute. Cannot determine profile name.`);
                throw new Error("Profile gname missing");
            }
            // get next save id
            const nextSid = currentSid ? (parseInt(currentSid, 10) + 1).toString() : '1';
            pretty.print(`Profile for ${username} has current sid: ${currentSid}. Next sid: ${nextSid}`, 'DEBUG');
            // construct profile path using the logged-in username
            const profileDir = path.join(global.config_server.profiles_folder, username);
            const profilePath = path.join(profileDir, 'profile');
            // ensure directory exists
            try {
                await fs.access(profileDir);
            } catch (dirError) {
                if (dirError.code === 'ENOENT') {
                    pretty.print(`Profile directory for ${username} does not exist. Creating...`, 'DEBUG');
                    await fs.mkdir(profileDir, { recursive: true });
                } else {
                    throw dirError;
                }
            }
            // update the 'sid' in the xml string before saving
            let finalXmlToSave = decodedData;
            if (currentSid) {
                finalXmlToSave = finalXmlToSave.replace(`sid="${currentSid}"`, `sid="${nextSid}"`);
            } else if (finalXmlToSave.includes('<profile ')) {
                // add sid if it doesn't exist - find the first '>' after '<profile'
                const profileTagEndIndex = finalXmlToSave.indexOf('>', finalXmlToSave.indexOf('<profile '));
                if (profileTagEndIndex !== -1) {
                    finalXmlToSave = finalXmlToSave.slice(0, profileTagEndIndex) + ` sid="${nextSid}"` + finalXmlToSave.slice(profileTagEndIndex);
                } else {
                    pretty.error(`Could not find closing tag for <profile> in ${username}'s save data. sid not added.`);
                }
            } else {
                pretty.error(`Could not find <profile> tag in ${username}'s save data. sid not added.`);
            }
            await fs.writeFile(profilePath, finalXmlToSave, 'utf8');
            pretty.print(`Profile saved successfully for user ${username} at ${profilePath}`);
            // build the <sp> response XML
            responseXmlString = create()
                .ele('h7_0')
                .ele('sp')
                .att('v', nextSid) // send the new save id
                .up()
                .up()
                .end({ headless: true, prettyPrint: false });
            // clear the save state on the socket
            socket.saveProfileState = null;
        } catch (error) {
            // sort-of silently fail for now
            pretty.error(`Error saving profile for ${username}: ${error.message}`, error);
            responseXmlString = create()
                .ele('h7_0')
                .ele('sp')
                .up()
                .up()
                .end({ headless: true, prettyPrint: false });
            socket.saveProfileState = null;
        }
        const responseBuffer = response.formatStreamResponse(responseXmlString);
        socket.write(responseBuffer);
        pretty.print(`Sent 'sp' (Save Profile End) response to ${username}.`);
    } else {
        // decrement chunksLeft and send <rr>
        socket.saveProfileState.chunksLeft -= 1;
        pretty.print(`Chunks remaining for ${username}: ${socket.saveProfileState.chunksLeft}`, 'DEBUG');
        const responseXmlString = create()
            .ele('h7_0')
            .ele('rr') // ready to recieve (moreeee chunks!)
            .up()
            .up()
            .end({ headless: true, prettyPrint: false });
        const responseBuffer = response.formatStreamResponse(responseXmlString);
        socket.write(responseBuffer);
        pretty.print(`Sent 'rr' (Ready to Receive) response to ${username}.`);
    }
}

async function saveProfilePartMiddleware(socket, commandInfo, next) {
    pretty.print(`Processing 'spp' (Save Profile Part) for Galaxy.`);
    try {
        await handleSaveProfilePart(socket, commandInfo);
        next();
    } catch (err) {
        pretty.error(`Unexpected error in 'spp' middleware: ${err.message}`, err);
        next(err);
    }
}

module.exports = {
    handleSaveProfilePart,
    saveProfilePartMiddleware,
};