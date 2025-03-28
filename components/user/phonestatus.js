const { create } = require('xmlbuilder2');
const db = require('../server/database.js');
const pretty = require('../utils/pretty.js');
const response = require('../utils/response.js');
const { sendStatusUpdate } = require('../utils/statusupdate.js');

async function updateUserPhoneStatus(id, newStatus) {
    const status = (newStatus === 1 || newStatus === '1') ? 1 : 0;
    try {
        const query = 'UPDATE users SET phone_status = ? WHERE id = ?';
        const result = await db.runQuery(query, [status, id]);
        pretty.print(`Updated phoneStatus to ${status} for user ${id}. Result: ${JSON.stringify(result)}`, 'DEBUG');
        return true;
    } catch (error) {
        pretty.error(`Failed to update phone_status for user ${id}: ${error.message}`, error);
        return false;
    }
}

async function changePhoneStatusMiddleware(socket, commandInfo, next) {
    pretty.print(`Processing 'u_cph' command.`);
    console.log(socket.userWristband);
    if (!socket.userWristband || !socket.userWristband.id) {
        pretty.error("User not logged in for 'u_cph' command.");
        return next(new Error("User not authenticated for u_cph"));
    }
    const currentUser = socket.userWristband;
    // extract the new phone status
    if (commandInfo.parts.length < 2) {
        pretty.error(`Malformed 'u_cph' command received. Parts: ${commandInfo.parts.join(', ')}`);
        return next(new Error("Malformed u_cph command"));
    }
    const newStatusString = commandInfo.parts[1];
    const newStatus = parseInt(newStatusString, 10);
    if (isNaN(newStatus) || (newStatus !== 0 && newStatus !== 1)) {
        pretty.error(`Invalid phone status received for 'u_cph': ${newStatusString}`);
        return next(new Error("Invalid phone status value"));
    }
    try {
        // update the phone status in the database
        const updateSuccess = await updateUserPhoneStatus(currentUser.id, newStatus);
        if (updateSuccess) {
            // update the phone status in the user object
            socket.userWristband.phoneStatus = newStatus;
            // build the confirmation response: <u_cph ph="..." id="..."/> and send it to the user and friends
            const responseXmlString = create()
                .ele('u_cph')
                .att('ph', newStatus.toString())
                .att('id', currentUser.id.toString())
                .end({ headless: true, prettyPrint: false });
            const responseBuffer = response.formatStreamResponse(responseXmlString);
            socket.write(responseBuffer);
            pretty.print(`Sent 'u_cph' confirmation to user ${currentUser.id}.`);
            await sendStatusUpdate(currentUser, 'u_cph', 'ph', newStatus.toString());
        } else {
            pretty.error(`Failed to update phone status for user ${currentUser.id}.`);
            return next(new Error("Failed to update phone status"));
        }
        next();
    } catch (err) {
        pretty.error(`Unexpected error in 'u_cph' middleware for user ${currentUser.id}: ${err.message}`, err);
        next(err); 
    }
}

module.exports = {
    updateUserPhoneStatus,
    changePhoneStatusMiddleware
};