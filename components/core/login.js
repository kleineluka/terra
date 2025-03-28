const db = require('../server/database.js');
const bcrypt = require('bcrypt');
const pretty = require('../utils/pretty.js');
const response = require('../utils/response.js');

async function loginRegisteredUser(username, password) {
    let resultCode = 0;
    let user = null;
    try {
        const query = 'SELECT * FROM users WHERE username = ?';
        const row = await db.getQuery(query, [username]);
        // fetch info from row
        if (row) {
            user = {
                username: row.username,
                password: row.password,
                id: row.id,
                isOnline: row.is_online,
            };
        } 
        // if the user exists
        if (user) {
            // verify the password
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (passwordMatch) {
                if (user.isOnline === 1) {
                    resultCode = 1; // already logged in
                } else {
                    resultCode = 0; // success
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

async function loginRegisteredUserMiddleware(socket, commandInfo, next) {
    pretty.print(`Attempting to log in a registered user (${commandInfo.parts[3]}).`); 
    try {
        if (commandInfo.parts.length < 4) {
            pretty.error('Incorrect a_lru command received.');
            throw new Error("Incorrect a_lru command received.");
        }
        if (!socket.connectionID) {
            pretty.error('Socket does not have a connectionID. Please assign it at connection time.');
            throw new Error("Socket does not have a connectionID. Please assign it at connection time.");
        }
        const password = commandInfo.parts[2];
        const username = commandInfo.parts[3];
        const { resultCode, user } = await loginRegisteredUser(username, password);
        let responseAttributes = {
            r: resultCode.toString(),
            s: "1" // static service id (like a1emu)
        };
        // add user ID only on successful login (resultCode 0)
        if (resultCode === 0 && user) {
            const dbConnectionID = socket.connectionID; // Get the UUID assigned by connectionManager
            const updateQuery = 'UPDATE users SET connection_id = ?, is_online = 1 WHERE id = ?';
            await db.runQuery(updateQuery, [dbConnectionID, user.id]);
            responseAttributes.u = user.id.toString();
            socket.userWristband = user; // so we can keep track of the user across requests
            pretty.print(`Associated user ${user.username} with socket ${dbConnectionID}.`);
        } else {
            socket.userWristband = null; // not really necessary, but just clear on fail
            pretty.print(`Login failed for ${username} with code ${resultCode}.`);
        }
        // build response + send
        const responseXml = response.createResponseXml('a_lru', responseAttributes);
        socket.write(responseXml);
        next();
    } catch (err) {
        pretty.error('Error processing a_lru middleware: ' + err.message, err);
        const errorResponse = response.createResponseXml('a_lru', { r: "6", s: "1" }); // code 6 for generic error
        socket.write(errorResponse);
        next(err);
    }
}

module.exports = {
    loginRegisteredUser,
    loginRegisteredUserMiddleware,
};