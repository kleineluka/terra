const { create } = require('xmlbuilder2');
const { escapeXmlAttr } = require('./xml.js');

const createResponseXml = (command, attributes = {}) => {
    const xml = create({ version: '1.0', encoding: 'UTF-8' })
        .ele(command);
    Object.entries(attributes).forEach(([key, value]) => {
        xml.att(key, value);
    });
    let xmlResponse = xml.end({ prettyPrint: false, headless: true });
    return formatStreamResponse(xmlResponse);
};

const buildAttributeString = (attributes = {}) => {
    return Object.entries(attributes)
        .map(([key, value]) => ` ${key}="${escapeXmlAttr(value)}"`)
        .join('');
};

const createChatResponseXml = (command, attributes = {}, innerXml = '', pluginId = '2', boardId = '0') => {
    const wrapperTag = `h${pluginId}_${boardId}`;
    let payload = '';

    if (command) {
        const attrString = buildAttributeString(attributes);
        payload = innerXml
            ? `<${command}${attrString}>${innerXml}</${command}>`
            : `<${command}${attrString} />`;
    } else if (innerXml) {
        payload = innerXml;
    }

    const xmlString = `<${wrapperTag}>${payload}</${wrapperTag}>`;
    return formatStreamResponse(xmlString);
};

const formatStreamResponse = (response) => {
    const responseBytes = Buffer.from(response, 'utf8');
    const terminator = Buffer.from([0x00]);
    return Buffer.concat([responseBytes, terminator]);
};

module.exports = { 
    createResponseXml,
    createChatResponseXml,
    formatStreamResponse };

