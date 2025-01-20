// initialize requirements with no dependencies
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const pretty = require('./components/utils/pretty.js');

// allocate the body parsers (BEFORE routing)
global.body_parser = require('body-parser');
require('body-parser-xml')(global.body_parser);

// load configuration files
global.config_costs = require("./config/costs.json");
global.config_database = require("./config/database.json");
global.config_items = require("./config/items.json");
global.config_server = require("./config/server.json");

// load the server with cookies, connect to the database, set up middleware, and handle routes
const app = express();
pretty.print("All server components have been loaded!");

// trust proxies to get an ip even when the server is running behind one
app.set('trust proxy', true)
app.use(cookieParser());

// create the server
app.listen(config_server['port'], config_server['host'], () => {
    pretty.print(`Server is running on http://${config_server['host']}:${config_server['port']}`);
});
