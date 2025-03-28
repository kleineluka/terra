const db = require('../server/database.js');
const bcrypt = require('bcrypt');
const pretty = require('../utils/pretty.js');
const response = require('../utils/response.js');

async function registerUser(commandInfo) {
    // parse the arguments from the command
    // todo: properly document the unknown fields
    const [_1, securityAnswer, securityQuestion, _2, _3, _4, password, username, chatStatus, phoneStatus, _6, _7] = commandInfo;
    // check if the username is already taken
    const userExists = await db.getQuery(`SELECT 1 FROM users WHERE username = ? LIMIT 1`, [username]);
    if (userExists) {
        return response.createResponseXml('u_reg', { r: 1 }); // the username is taken
    }
    // hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    // insert the user into the database
    const insertQuery = `
            INSERT INTO users (username, password, security_question, security_answer, phone_status, chat_status)
            VALUES (?, ?, ?, ?, ?, ?);
        `;
    const params = [username, hashedPassword, securityQuestion, securityAnswer, phoneStatus, chatStatus];
    // build + send the response
    try {
        await db.runQuery(insertQuery, params);
        pretty.print(`User ${username} registered.`, 'DATABASE');
        return response.createResponseXml('u_reg', { r: 0 }); // we did it!
    } catch (error) {
        pretty.error('Error inserting user:', error.message);
        return response.createResponseXml('u_reg', { r: 6 }); // who knows.. generic error :p
    }
}

function registerUserMiddleware(socket, commandInfo, next) {
    pretty.print('Attempting to register a new user to the database.', 'DATABASE', '');
    registerUser(commandInfo.parts)
        .then((responseXml) => {
            socket.write(responseXml); // send response to the client
            next(); // proceed to next middleware
        })
        .catch((err) => {
            socket.write(`Error processing u_reg: ${err.message}`);
            next(err);
        });
}

module.exports = {
    registerUser,
    registerUserMiddleware
};
