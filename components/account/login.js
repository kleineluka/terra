// imports
const db = require('./../server/database.js');
const bcrypt = require('bcrypt');
const pretty = require('./../utils/pretty.js');
const ResponseBuilder = require('./../utils/response.js');

// login a user
async function loginUser(username, password, connectionID) {
    let resultCode = 0;
    let user = null;
    try {
        const query = 'SELECT * FROM users WHERE username = ?';
        const rows = await db.getQuery(query, [username]);
        // fetch info from row
        if (rows.length > 0) {
            const row = rows[0];
            user = {
                username: row.username,
                password: row.password,
                userID: row.userID,
                isOnline: row.isOnline,
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
                    // update connection ID
                    const updateQuery = 'UPDATE users SET connectionID = ?, isOnline = 1 WHERE userID = ?';
                    await db.runQuery(updateQuery, [connectionID, user.userID]);
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
}