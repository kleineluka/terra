const { create } = require('xmlbuilder2');
const response = require('../utils/response.js');
const pretty = require('../utils/pretty.js'); 

async function getVersionStatistics() {
    // static version string: <h7_0><vsu id="0"></vsu></h7_0>
    const responseXmlString = create()
        .ele('h7_0')
        .ele('vsu')
        .att('id', '0')
        .up()
        .end({ headless: true, prettyPrint: false });
    return responseXmlString;
}

async function versionStatistisMiddleware(socket, commandInfo, next) {
    try {
        const responseXmlString = await getVersionStatistics();
        const responseBuffer = response.formatStreamResponse(responseXmlString);
        socket.write(responseBuffer);
        next(); 
    } catch (err) {
        pretty.error(`Unexpected error generating/sending 'vsu' response: ${err.message}`, err);
        next(err); 
    }
}

module.exports = {
    getVersionStatistics,
    versionStatistisMiddleware
};