const { create } = require('xmlbuilder2');
const db = require('../server/database.js');
const pretty = require('./pretty.js');
const { sendToUserByConnectionId } = require('./connections.js');

async function sendStatusUpdate(currentUserData, statusHeader, shortHeader, statusValue) {
    if (!currentUserData || !currentUserData.id) {
        pretty.error("sendStatusUpdate called without valid currentUserData.", null);
        return;
    }
    pretty.print(`Sending status update (${statusHeader}/${shortHeader}=${statusValue}) for user ${currentUserData.id}...`, 'DEBUG');
    let friendListString = '';
    try {
        // get the current user's friend list string from db
        const friendQuery = 'SELECT friend_list FROM users WHERE id = ?';
        const rows = await db.getQuery(friendQuery, [currentUserData.id]);
        if (rows.length > 0 && rows[0].friend_list) {
            friendListString = rows[0].friend_list;
        } else {
            pretty.print(`User ${currentUserData.id} has no friends or friend list is null.`, 'DEBUG');
            return; 
        }
        // split the friend list string into an array of friend IDs
        const friendIDs = friendListString.split(',').filter(id => id.trim() !== ''); 
        if (friendIDs.length === 0) {
            pretty.print(`User ${currentUserData.id}'s friend list was empty after parsing.`, 'DEBUG');
            return;
        }
        pretty.print(`User ${currentUserData.id} has ${friendIDs.length} friends. Checking online status...`, 'DEBUG');
        // look through the friends
        for (const friendIdStr of friendIDs) {
            const friendId = parseInt(friendIdStr, 10); 
            if (isNaN(friendId)) {
                pretty.print(`Skipping invalid friend ID: ${friendIdStr}`, 'WARN');
                continue;
            }
            if (friendId === currentUserData.id) continue; // skip self
            try {
                const friendStatusQuery = 'SELECT isOnline, connectionID FROM users WHERE id = ?';
                const friendRows = await db.getQuery(friendStatusQuery, [friendId]);
                if (friendRows.length > 0) {
                    const friend = friendRows[0];
                    // check if the friend is online and has a connectionID
                    if (friend.isOnline === 1 && friend.connectionID) {
                        // build the XML message
                        const updateXmlString = create()
                            .ele(statusHeader)
                            .att(shortHeader, statusValue)
                            .att('id', currentUserData.id.toString()) // the user who changed status
                            .end({ headless: true, prettyPrint: false });
                        // send the message using the connection manager
                        sendToUserByConnectionId(friend.connectionID, updateXmlString);
                    } else {
                        pretty.print(`friend ${friendId} is offline or has no connectionID. Skipping update.`, 'DEBUG');
                    }
                } else {
                    pretty.print(`friend ID ${friendId} not found in database. Skipping update.`, 'WARN');
                }
            } catch (friendQueryError) { // just continue to the next friend
                pretty.error(`Error querying status for friend ${friendId}: ${friendQueryError.message}`, friendQueryError);
            }
        } // end of loop
    } catch (error) {
        pretty.error(`Error during sendStatusUpdate for user ${currentUserData.id}: ${error.message}`, error);
    }
}

module.exports = {
    sendStatusUpdate
};