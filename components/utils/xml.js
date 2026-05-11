// replaces special characters with xml entities to prevent breaking client-side xml parsing
const escapeXmlAttr = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// builds safe xml attributes from a key-value object, ignoring invalid keys
function buildAttrs(attrs) {
    return Object.entries(attrs)
        .filter(([k]) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k))
        .map(([k, v]) => `${k}="${String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}"`)
        .join(' ');
}

module.exports = {
    escapeXmlAttr,
    buildAttrs
};
