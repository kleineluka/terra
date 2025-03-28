const response = require('../utils/response.js');
const pretty = require('../utils/pretty.js');

async function loginGuestUser() {
    // build the response XML for the guest user login
    const responseXml = response.createResponseXml('a_lgu', {
        r: '0',      // Result
        u: '0',      // User ID
        n: 'GUESTUSER', // Username
        p: '',       // Password
        s: '1'       // Service ID
    });

    pretty.print('Guest user logged in.');
    return responseXml;
}

// middleware for guest user login
async function loginGuestUserMiddleware(socket, commandInfo, next) {
    pretty.print('Attempting to log in a guest user.');
    try {
        // await the guest login response and send to client
        const responseXml = await loginGuestUser();
        socket.guestWristband = 'GUEST_' + `${socket.remoteAddress}:${socket.remotePort}`; // so we can keep track of the user across requests
        socket.write(responseXml);
        next();
    } catch (err) {
        // write an error message to the client
        pretty.error('Error processing a_lgu: ' + err.message);
        socket.write(response.createResponseXml('a_lgu', { r: 1 })); // to-do: verify this is the correct error code
        next(err);
    }
}

// exports
module.exports = {
    loginGuestUser,
    loginGuestUserMiddleware
};