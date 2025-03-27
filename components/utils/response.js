const { create } = require('xmlbuilder2');

const createResponseXml = (command, attributes = {}) => {
    const xml = create({ version: '1.0', encoding: 'UTF-8' })
        .ele(command);
    Object.entries(attributes).forEach(([key, value]) => {
        xml.att(key, value);
    });
    let xmlResponse = xml.end({ prettyPrint: false, headless: true });
    return formatStreamResponse(xmlResponse);
};

const formatStreamResponse = (response) => {
    const responseBytes = Buffer.from(response, 'ascii');
    const terminator = Buffer.from([0x00]);
    return Buffer.concat([responseBytes, terminator]);
};

module.exports = { createResponseXml, formatStreamResponse };

