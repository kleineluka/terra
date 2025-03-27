// import dependencies
const net = require('net');
const express = require('express');
const cookieParser = require('cookie-parser');

// import utils
const pretty = require('./components/utils/pretty.js');

// load configuration files
global.config_costs = require("./configs/costs.json");
global.config_database = require("./configs/database.json");
global.config_items = require("./configs/items.json");
global.config_server = require("./configs/server.json");

// import servers + initialize database
const { HTMLServer } = require('./components/server/http.js');
const { TCPServer } = require('./components/server/tcp.js');
const { initialize } = require('./components/server/database.js');
initialize();

// import middlewares
const { registerUserMiddleware } = require('./components/account/create.js');
const { loginGuestUserMiddleware } = require('./components/account/guest.js');
const { hostDetailsMiddleware } = require('./components/details/host.js');
const { pluginsDetailsMiddleware } = require('./components/details/plugins.js');

// allocate the body parsers (BEFORE routing)
global.body_parser = require('body-parser');
require('body-parser-xml')(global.body_parser);

// create the app (& html server)
const app = express();
const htmlServer = new HTMLServer(app);
app.listen(config_server['port'], config_server['host'], () => {
    pretty.print(`HTML server started on http://${config_server['host']}:${config_server['port']}.`);
});

// create the tpc server
const tcpServer = new TCPServer();
tcpServer.use(registerUserMiddleware, 'u_reg'); // Register User Account
tcpServer.use(loginGuestUserMiddleware, 'a_lgu'); // Login Guest User
tcpServer.use(hostDetailsMiddleware, 'a_gsd'); // Get Host Details
tcpServer.use(pluginsDetailsMiddleware, 'a_gpd'); // Get Plugin Details
tcpServer.listen(config_server['tcp_port'], config_server['host'], () => {
    pretty.print('TCP server started on ' + config_server['host'] + ':' + config_server['tcp_port']);
});

// log http requests
app.use((req, res, next) => {
    pretty.request(req.method, req.headers['user-agent'], req.ip, req.url);
    next();
});
