const fs = require('fs');
const path = require('path');
const pretty = require('./pretty.js');

const loadConfig = (filename) => {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', "..", "configs", filename), 'utf8'));
};

const setupEnvironment = () => {
    // load configuration files into global variables
    global.config_costs = loadConfig("costs.json");
    global.config_database = loadConfig("database.json");
    global.config_items = loadConfig("items.json");
    global.config_server = loadConfig("server.json");
    pretty.print('Loaded configurations into volatile memory.', 'ACTION');
    // ensure the profiles folder is ready to be used
    const profiles_folder = path.join(__dirname, '..', "..", config_server.profiles_folder);
    if (!fs.existsSync(profiles_folder)) {
        fs.mkdirSync(profiles_folder);
        pretty.print('Created profiles folder.', 'ACTION');
    } else {
        pretty.print('Profiles folder already exists! Welcome back..');
    }
};

module.exports = { setupEnvironment };
