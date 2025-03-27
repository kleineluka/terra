// imports
const db = require('../server/database.js');
const bcrypt = require('bcrypt');
const pretty = require('../utils/pretty.js');
const ResponseBuilder = require('../utils/response.js');

// login a user
async function loginRegisteredUser(username, password, connectionID) {
    let resultCode = 0;
    let user = null;
    try {
        const query = 'SELECT * FROM users WHERE username = ?';
        const row = await db.getQuery(query, [username]);
        console.log("ran query");
        console.log(row);
        // fetch info from row
        if (row) {
            user = {
                username: row.username,
                password: row.password,
                id: row.id,
                isOnline: row.is_online,
            };
        } 
        console.log("Testing:" + password);
        // if the user exists
        if (user) {
            // verify the password
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (passwordMatch) {
                if (user.isOnline === 1) {
                    resultCode = 1; // already logged in
                } else {
                    // update connection ID
                    const updateQuery = 'UPDATE users SET connection_id = ?, is_online = 1 WHERE id = ?';
                    await db.runQuery(updateQuery, [connectionID, user.id]);
                }
            } else {
                resultCode = 4; // incorrect password
            }
        } else {
            resultCode = 5; // user not found
        }
    } catch (err) {
        pretty.error('Error when trying to login user: ' + err);
        resultCode = 6; // generic error
    }
    return { resultCode, user };
}

// middleware for registered user login
async function loginRegisteredUserMiddleware(socket, commandInfo, next) {
    pretty.print(`Attempting to log in a registered user (${commandInfo.parts[3]}).`); 
    try {
        if (commandInfo.parts.length < 4) {
            pretty.error('Incorrect a_lru command received.');
            throw new Error("Incorrect a_lru command received.");
        }
        const password = commandInfo.parts[2];
        const username = commandInfo.parts[3];
        const connectionID = `${socket.remoteAddress}:${socket.remotePort}`; // todo: migrate to guid or something more unique?
        const { resultCode, user } = await loginRegisteredUser(username, password, connectionID);
        let responseAttributes = {
            r: resultCode.toString(),
            s: "1" // static service id (like a1emu)
        };
        // add user ID only on successful login (resultCode 0)
        if (resultCode === 0 && user) {
            responseAttributes.u = user.id.toString();
            socket.userData = user; // so we can keep track of the user across requests
            pretty.print(`Associated user ${user.username} with socket ${connectionID}.`);
        } else {
            socket.userData = null; // not really necessary, but just clear on fail
            pretty.print(`Login failed for ${username} with code ${resultCode}.`);
        }
        // build response + send
        const responseXml = ResponseBuilder.createResponseXml('a_lru', responseAttributes);
        socket.write(responseXml);
        next();
    } catch (err) {
        pretty.error('Error processing a_lru middleware: ' + err.message, err);
        const errorResponse = ResponseBuilder.createResponseXml('a_lru', { r: "6", s: "1" }); // code 6 for generic error
        socket.write(errorResponse);
        next(err);
    }
}

// exports
module.exports = {
    loginRegisteredUser,
    loginRegisteredUserMiddleware,
};