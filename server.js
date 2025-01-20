// initialize requirements with no dependencies
const net = require('net');
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

// create the http server
app.listen(config_server['port'], config_server['host'], () => {
    pretty.print(`Server is running on http://${config_server['host']}:${config_server['port']}`);
});

// create the tcp server
const tcpServer = net.createServer((socket) => {
    pretty.print(`TCP connection established from ${socket.remoteAddress}:${socket.remotePort}`);

    socket.on('data', (data) => {
        pretty.print(`Received TCP data: ${data}`);
        socket.write('Echo: ' + data); 
    });

    socket.on('close', () => {
        pretty.print('TCP connection closed');
    });

    socket.on('error', (err) => {
        pretty.print(`TCP error: ${err.message}`);
    });
});

// Start TCP server
tcpServer.listen(config_server['tcp_port'], config_server['host'], () => {
    pretty.print(`TCP server is running on ${config_server['host']}:${config_server['tcp_port']}`);
});

// log requests
//function request(kind, user_agent, ip, url) {
app.use((req, res, next) => {
    pretty.request(req.method, req.headers['user-agent'], req.ip, req.url);
    next();
});