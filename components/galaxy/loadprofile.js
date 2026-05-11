const fs = require('fs').promises;
const path = require('path');
const { create } = require('xmlbuilder2');
const response = require('../utils/response.js');
const pretty = require('../utils/pretty.js'); 

async function loadProfile(username) {
    if (!global.config_server || !global.config_server.profiles_folder) {
        pretty.error("Configuration missing: profiles_folder in server.json is not set!");
        return null;
    }
    const profilePath = path.join(global.config_server.profiles_folder, username, 'profile');
    pretty.print(`Attempting to load profile from: ${profilePath}`, 'DEBUG');
    try {
        const xmlContent = await fs.readFile(profilePath, 'utf8');
        pretty.print(`Successfully read profile for ${username}.`, 'DEBUG');
        return xmlContent;
    } catch (error) {
        if (error.code === 'ENOENT') {
            pretty.print(`No profile file found for user ${username} at ${profilePath}.`);
        } else {
            pretty.error(`Error reading profile for ${username}: ${error.message}`, error);
        }
        return null; 
    }
}

async function loadProfileMiddleware(socket, commandInfo, next) {
    pretty.print(`Processing 'lp' (Load Profile) command.`);
    if (!socket.userWristband || !socket.userWristband.username) {
        pretty.error("User not logged in for 'lp' command.");
        socket.write(response.formatStreamResponse("<h7_0 />"));
        return next(new Error("User not authenticated for lp"));
    }
    const username = socket.userWristband.username;
    try {
        const profileContent = await loadProfile(username);
        let finalXmlString;
        if (profileContent !== null) {
            finalXmlString = `<h7_0>${profileContent}</h7_0>`;
            pretty.print(`Sending profile data for ${username}.`);
        } else {
            finalXmlString = '<h7_0 />';
            pretty.print(`Sending empty profile response for ${username} (profile not found or error).`);
        }
        const responseBuffer = response.formatStreamResponse(finalXmlString);
        socket.write(responseBuffer);
        next();
    } catch (err) {
        pretty.error(`Unexpected error in 'lp' middleware for ${username}: ${err.message}`, err);
        socket.write(response.formatStreamResponse("<h7_0 />")); // is this, uh, dangerous? won't it overwrite their local profile with nothing??
        next(err);
    }
}

module.exports = {
    loadProfile,
    loadProfileMiddleware
};