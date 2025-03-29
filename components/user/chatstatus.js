const { create } = require('xmlbuilder2');
const db = require('../server/database.js');
const pretty = require('../utils/pretty.js');
const response = require('../utils/response.js');
const { sendStatusUpdate } = require('../utils/statusupdate.js');

const VALID_STATUSES = [0, 1, 2, 3]; // 0: Ready, 1: DND, 2: Playing, 3: Partying

async function updateUserChatStatus(id, newStatus) {
    if (!VALID_STATUSES.includes(newStatus)) {
        pretty.error(`Invalid chat status provided: ${newStatus} for user ${id}.`);
        return false;
    }
    try {
        const query = 'UPDATE users SET chat_status = ? WHERE id = ?';
        await db.runQuery(query, [newStatus, id]);
        pretty.print(`Updated chatStatus to ${newStatus} for user ${id}.`, 'DATABASE');
        return true;
    } catch (error) {
        pretty.error(`Failed to update chat_status for user ${id}: ${error.message}`, error);
        return false;
    }
}

async function changeChatStatusMiddleware(socket, commandInfo, next) {
    pretty.print(`Processing 'u_ccs' command.`);
    if (!socket.userWristband || !socket.userWristband.id) {
        pretty.error("User not logged in for 'u_ccs' command.");
        return next(new Error("User not authenticated for u_ccs"));
    }
    const currentUser = socket.userWristband;
    // get the chat status
    if (commandInfo.parts.length < 2) {
        pretty.error(`Malformed 'u_ccs' command received. Parts: ${commandInfo.parts.join(', ')}`);
        return next(new Error("Malformed u_ccs command: Missing status attribute"));
    }
    const newStatusString = commandInfo.parts[1];
    const newStatus = parseInt(newStatusString, 10);
    if (isNaN(newStatus) || !VALID_STATUSES.includes(newStatus)) {
        pretty.error(`Invalid chat status received for 'u_ccs': ${newStatusString}`);
        return next(new Error(`Invalid chat status value: ${newStatusString}`));
    }
    try {
        // update the chat status in the database
        const updateSuccess = await updateUserChatStatus(currentUser.id, newStatus);
        if (updateSuccess) {
            // update in-memory user object
            socket.userWristband.chatStatus = newStatus;
            pretty.print(`Chat status updated locally for user ${currentUser.id} to ${newStatus}.`);
            // build the response: <u_ccs s="..." id="..."/>
            const responseXmlString = create()
                .ele('u_ccs')
                .att('s', newStatus.toString())
                .att('id', currentUser.id.toString())
                .end({ headless: true, prettyPrint: false });
            const responseBuffer = response.formatStreamResponse(responseXmlString);
            socket.write(responseBuffer);
            pretty.print(`Sent 'u_ccs' confirmation to user ${currentUser.id}.`);
            // update friends about the status change
            const updatedUserDataForFriends = { ...currentUser, chatStatus: newStatus };
            await sendStatusUpdate(updatedUserDataForFriends, 'u_ccs', 's', newStatus.toString());
        } else {
            return next(new Error("Failed to update chat status in database"));
        }
        next(); 
    } catch (err) {
        pretty.error(`Unexpected error in 'u_ccs' middleware for user ${currentUser.id}: ${err.message}`, err);
        next(err);
    }
}

module.exports = {
    updateUserChatStatus,
    changeChatStatusMiddleware
};