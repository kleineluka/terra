const { create } = require('xmlbuilder2');
const db = require('../server/database.js');
const pretty = require('../utils/pretty.js');
const response = require('../utils/response.js');
const { sendStatusUpdate } = require('../utils/statusupdate.js');

async function getFriendList(userId) {
    const friendDataList = [];
    let friendListString = '';
    try {
        // get the user's friends list
        const userRow = await db.getQuery('SELECT friend_list FROM users WHERE id = ?', [userId]);
        if (userRow && userRow.friend_list) {
            friendListString = userRow.friend_list;
        } else {
            pretty.print(`User ${userId} has no friends or friend list is null.`, 'DEBUG');
            return { friendDataList, friendListString }; 
        }
        // split the string into an array of friend ids
        const friendIds = friendListString.split(',').filter(id => id.trim() !== '');
        if (friendIds.length === 0) {
            pretty.print(`User ${userId}'s friend list was empty after parsing.`, 'DEBUG');
            return { friendDataList, friendListString }; 
        }
        pretty.print(`User ${userId} has ${friendIds.length} friends. Fetching details...`, 'DEBUG');
        // get details for each friend
        const friendPromises = friendIds.map(async (friendIdStr) => {
            const friendId = parseInt(friendIdStr.trim(), 10);
            if (isNaN(friendId)) {
                pretty.print(`Skipping invalid friend ID: ${friendIdStr}`, 'WARN');
                return null; 
            }
            try {
                const friendRow = await db.getQuery(
                    'SELECT username, is_online, chat_status, phone_status FROM users WHERE id = ?',
                    [friendId]
                );
                if (friendRow) {
                    return {
                        id: friendId,
                        username: friendRow.username,
                        isOnline: friendRow.is_online ?? 0, // default offline if null
                        status: friendRow.chat_status ?? 0,  // default to 0 if null
                        phoneStatus: friendRow.phone_status ?? 0 // default to 0 if null
                    };
                } else {
                    pretty.print(`Friend ID ${friendId} not found in database. Skipping.`, 'WARN');
                    return null; 
                }
            } catch (friendQueryError) {
                pretty.error(`Error querying details for friend ${friendId}: ${friendQueryError.message}`, friendQueryError);
                return null; 
            }
        });
        // wait for all friend detail queries to complete and filter out bad results
        const resolvedFriends = await Promise.all(friendPromises);
        friendDataList.push(...resolvedFriends.filter(friend => friend !== null));
    } catch (error) {
        pretty.error(`Error fetching friend list for user ${userId}: ${error.message}`, error);
        return { friendDataList: [], friendListString };
    }
    return { friendDataList, friendListString };
}

async function getFriendListMiddleware(socket, commandInfo, next) {
    pretty.print(`Processing 'u_gbl' (Get Friend List) command.`);
    if (!socket.userWristband || !socket.userWristband.id) {
        pretty.error("User not logged in for 'u_gbl' command.");
        // Send an error response (adjust code '1' if needed)
        socket.write(response.createResponseXml('u_gbl', { r: '1' }));
        return next(new Error("User not authenticated for u_gbl"));
    }
    const currentUser = socket.userWristband;
    try {
        const { friendDataList, friendListString } = await getFriendList(currentUser.id);
        const root = create().ele('u_gbl').att('r', '0');
        friendDataList.forEach(friend => {
            root.ele('buddy')
                .att('id', friend.id.toString())
                .att('n', friend.username)
                .att('s', friend.status.toString())
                .att('o', friend.isOnline.toString())
                .att('ph', friend.phoneStatus.toString())
                .up(); // go back to the <u_gbl> element
        });
        const responseXmlString = root.end({ headless: true, prettyPrint: false });
        const responseBuffer = response.formatStreamResponse(responseXmlString);
        socket.write(responseBuffer);
        pretty.print(`Sent friend list to user ${currentUser.username}.`);
        if (currentUser.isOnline !== 1) {
            await db.runQuery('UPDATE users SET is_online = 1 WHERE id = ?', [currentUser.id]);
            socket.userWristband.isOnline = 1; // update in-memory value as well
            pretty.print(`Set user ${currentUser.username} online status to 1.`);
            // notify friends about the online status change (if any)
            if (friendListString && friendListString.trim() !== '') {
                await sendStatusUpdate(currentUser, 'u_cos', 'o', '1');
                pretty.print(`Sent online status update for ${currentUser.username} to their friends.`);
            }
        }
        next(); 
    } catch (err) {
        pretty.error(`Error in 'u_gbl' middleware for user ${currentUser.username}: ${err.message}`, err);
        socket.write(response.createResponseXml('u_gbl', { r: '1' })); // generic error code?
        next(err);
    }
}

module.exports = {
    getFriendList,
    getFriendListMiddleware
};