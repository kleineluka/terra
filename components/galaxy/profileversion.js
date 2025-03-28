const fs = require('fs').promises;
const path = require('path');
const { parseStringPromise } = require('xml2js');
const { create } = require('xmlbuilder2');
const response = require('../utils/response.js');
const pretty = require('../utils/pretty.js'); 

async function loadProfileVersion(username) {
    if (!global.config_server || !global.config_server.profiles_folder) {
        pretty.error("Configuration missing~ profiles_folder in server.json is not set!");
        return null;
    }
    // if the user has a save, return the version, otherwise return null
    const profilePath = path.join(global.config_server.profiles_folder, username, 'profile');
    try {
        // check if it exists, and if it does, read it + parse it
        await fs.access(profilePath, fs.constants.R_OK); // Check read access
        pretty.print(`Profile found for ${username} at ${profilePath}`, 'DEBUG');
        const xmlContent = await fs.readFile(profilePath, 'utf8');
        const parsedData = await parseStringPromise(xmlContent);
        // extract 'sid' attribute from the root ('profile') element (xml2js puts attributes under '$')
        if (parsedData.profile && parsedData.profile.$ && parsedData.profile.$.sid) {
            const saveID = parsedData.profile.$.sid;
            pretty.print(`Found profile version (sid): ${saveID} for user ${username}`, 'DEBUG');
            return saveID.toString(); // return the version
        } else {
            pretty.print(`Profile for ${username} exists but lacks 'sid' attribute.`, 'WARN');
            return null; 
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            pretty.print(`No profile file found for user ${username} at ${profilePath}.`, 'DEBUG');
        } else if (error instanceof Error && error.message.includes('Non-whitespace before first tag')) {
            pretty.error(`XML parsing error for ${username}'s profile: Invalid XML format. ${error.message}`, error);
        }
        else {
            pretty.error(`Error accessing/reading profile for ${username}: ${error.message}`, error);
        }
        return null; 
    }
}

async function loadProfileVersionMiddleware(socket, commandInfo, next) {
    // ensure the user is logged in
    if (!socket.userWristband || !socket.userWristband.username) {
        pretty.error("User not logged in or username missing for 'lpv' command.");
        const errorXml = create().ele('h7_0').ele('lpv').up().end({ headless: true }); // send empty response
        socket.write(response.formatStreamResponse(errorXml));
        return next(new Error("User not authenticated for lpv.."));
    }
    const username = socket.userWristband.username;
    try {
        const saveID = await loadProfileVersion(username);
        // xml response to make: <h7_0><lpv v="..."></lpv></h7_0>
        const root = create().ele('h7_0');
        const lpvElement = root.ele('lpv');
        // add the 'v' attribute ONLY if saveID was found
        if (saveID !== null) {
            lpvElement.att('v', saveID);
        }
        const finalXmlString = root.end({ headless: true, prettyPrint: false });
        const responseBuffer = response.formatStreamResponse(finalXmlString);
        socket.write(responseBuffer);
        pretty.print(`Sent 'lpv' response for ${username}. Version: ${saveID ?? 'N/A'}`);
        next(); 
    } catch (err) {
        pretty.error(`Unexpected error in 'lpv' middleware for ${username}: ${err.message}`, err);
        const errorXml = create().ele('h7_0').ele('lpv').up().end({ headless: true });
        socket.write(response.formatStreamResponse(errorXml));
        next(err);
    }
}

module.exports = {
    loadProfileVersion,
    loadProfileVersionMiddleware
};