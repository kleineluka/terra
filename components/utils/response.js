const { create } = require('xmlbuilder2');

class ResponseBuilder {

    // builds a xml response
    createResponseXml(command, attributes = {}) {
        const xml = create({ version: '1.0', encoding: 'UTF-8' })
            .ele(command);
        Object.entries(attributes).forEach(([key, value]) => {
            xml.att(key, value);
        });
        let xmlResponse = xml.end({ prettyPrint: true });
        return this.formatStreamResponse(xmlResponse);
    }

    // formats it to what ub funkeys expects
    formatStreamResponse(response) {
        // converts the string to a byte array and then adds a null terminator
        const responseBytes = Buffer.from(response, 'ascii'); 
        const terminator = Buffer.from([0x00]); 
        return Buffer.concat([responseBytes, terminator]);
    }
    
}

module.exports = new ResponseBuilder();
