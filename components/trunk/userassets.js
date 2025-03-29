const fs = require('fs').promises;
const path = require('path');
const { parseStringPromise } = require('xml2js');
const { create } = require('xmlbuilder2');
const db = require('../server/database.js');
const pretty = require('../utils/pretty.js');
const response = require('../utils/response.js');

const getSafe = (obj, path, defaultValue = null) => {
    // safely get nested properties from an object
    return path.split('.').reduce((acc, part) => acc && acc[part] !== undefined ? acc[part] : defaultValue, obj);
};

// todo: potential edge case where the user has an empty profile but the database has jammers
async function getUserAssets(socket) {
    const username = socket.userWristband.username;
    const userId = socket.userWristband.id;
    const profilePath = path.join(global.config_server.profiles_folder, username, 'profile');
    const root = create().ele('h10_0');
    const guaElement = root.ele('gua');
    try {
        // read and parse the profile
        pretty.print(`Attempting to read profile for ${username} at ${profilePath}`, 'DEBUG');
        const xmlContent = await fs.readFile(profilePath, 'utf8');
        const parsedProfile = await parseStringPromise(xmlContent);
        // extract the familiars from the saved profile (not database)
        const familiars = getSafe(parsedProfile, 'profile.trunk.0.familiars.0.familiar', []);
        if (familiars && Array.isArray(familiars)) {
            familiars.forEach(familiar => {
                const attrs = familiar.$;
                if (attrs && attrs.id && attrs.start && attrs.time) {
                    const timeInMinutes = Math.floor(parseInt(attrs.time, 10) / 60); // convert seconds to minutes
                    guaElement.ele('f')
                        .att('id', attrs.id)
                        .att('p', attrs.start) // 'p' corresponds to 'start'
                        .att('c', timeInMinutes.toString()) // 'c' corresponds to 'time' in minutes
                        .up();
                } else {
                    pretty.print(`Skipping familiar due to missing attributes: ${JSON.stringify(attrs)}`, 'WARN');
                }
            });
        } else {
            pretty.print(`No familiars found or invalid structure in profile for ${username}`, 'DEBUG');
        }
        // extract moods from the saved profile (not database)
        const moods = getSafe(parsedProfile, 'profile.trunk.0.moods.0.mood', []);
        if (moods && Array.isArray(moods)) {
            moods.forEach(mood => {
                const attrs = mood.$;
                if (attrs && attrs.id) {
                    guaElement.ele('m')
                        .att('id', attrs.id)
                        .up();
                } else {
                    pretty.print(`Skipping mood due to missing attributes: ${JSON.stringify(attrs)}`, 'WARN');
                }
            });
        } else {
            pretty.print(`No moods found or invalid structure in profile for ${username}`, 'DEBUG');
        }
        // extract jammers (from the database)
        try {
            const jammerQuery = 'SELECT jammers_total, jammers_used FROM users WHERE id = ?';
            const jammerRow = await db.getQuery(jammerQuery, [userId]);
            const jammersTotal = parseInt(jammerRow?.jammers_total || '0', 10);
            const jammersUsed = jammerRow?.jammers_used?.toString() || '0';
            if (jammersTotal > 0) {
                guaElement.ele('j')
                    .att('id', '80014a') // gardcoded ID for Jammers
                    .att('p', jammersUsed)     // 'p' corresponds to 'jammersUsed'
                    .att('c', jammersTotal.toString()) // 'c' corresponds to 'jammersTotal'
                    .up();
            }
        } catch (dbError) {
            pretty.error(`Database error fetching jammers for user ${userId}: ${dbError.message}`, dbError);
        }
    } catch (error) {
        // these will continue on to pass an empty gua response
        if (error.code === 'ENOENT') {
            pretty.print(`No profile file found for user ${username} at ${profilePath}. Sending empty gua.`, 'DEBUG');
        } else if (error instanceof Error && error.message.includes('Non-whitespace before first tag')) {
            pretty.error(`XML parsing error for ${username}'s profile: Invalid XML format. ${error.message}`, error);
        } else {
            pretty.error(`Error processing profile for ${username}: ${error.message}`, error);
        }
    }
    return root.end({ headless: true, prettyPrint: false });
}

async function getUserAssetsMiddleware(socket, commandInfo, next) {
    pretty.print(`Processing 'gua' (Get User Assets)`);
    if (!socket.userWristband || !socket.userWristband.id) {
        pretty.error("User not logged in for 'gua' command.");
        const errorXml = create().ele('h10_0').ele('gua').up().end({ headless: true });
        socket.write(response.formatStreamResponse(errorXml));
        return next(new Error("User not authenticated for gua"));
    }
    try {
        let responseBuffer = await getUserAssets(socket);
        responseBuffer = response.formatStreamResponse(responseBuffer);
        socket.write(responseBuffer);
        pretty.print(`Sent 'gua' response for ${socket.userWristband.username}.`);
        next();
    } catch (err) {
        pretty.error(`Unexpected error in 'gua' middleware for ${socket.userWristband.username}: ${err.message}`, err);
        const errorXml = create().ele('h10_0').ele('gua').up().end({ headless: true });
        socket.write(response.formatStreamResponse(errorXml));
        next(err);
    }
}

module.exports = {
    getUserAssets,
    getUserAssetsMiddleware,
};