const fs = require('fs').promises;
const path = require('path');
const { parseStringPromise } = require('xml2js');
const { create } = require('xmlbuilder2');
const ResponseBuilder = require('../utils/response.js');
const pretty = require('../utils/pretty.js'); 

async function getProfileVersion(username) {
    if (!global.config_server || !global.config_server.profiles_folder) {
        pretty.error("Configuration missing: global.config_server.profiles_folder is not set.");
        return null;
    }
    const profilePath = path.join(global.config_server.galaxy_save_path, username, 'profile');
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