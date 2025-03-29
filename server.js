// import dependencies
const net = require('net');
const express = require('express');
const cookieParser = require('cookie-parser');

// import utils
const pretty = require('./components/utils/pretty.js');

// set up the environment
const environment = require('./components/utils/environment.js');
environment.setupEnvironment();

// import servers + initialize database
const { HTMLServer } = require('./components/server/http.js');
const { TCPServer } = require('./components/server/tcp.js');
const { initialize } = require('./components/server/database.js');
initialize();

// import middlewares
// core plugin
const { registerUserMiddleware } = require('./components/core/create.js');
const { loginGuestUserMiddleware } = require('./components/core/guest.js');
const { hostDetailsMiddleware } = require('./components/core/host.js');
const { pluginsDetailsMiddleware } = require('./components/core/plugins.js');
const { loginRegisteredUserMiddleware } = require('./components/core/login.js');
const { heartbeatMiddleware } = require('./components/core/heartbeat.js');
// galaxy plugin
const { loadProfileVersionMiddleware  } = require('./components/galaxy/profileversion.js');
const { versionStatistisMiddleware } = require('./components/galaxy/versionstatistics.js');
const { saveProfilePartMiddleware } = require('./components/galaxy/saveprofilepart.js');
// user plugin
const { changePhoneStatusMiddleware } = require('./components/user/phonestatus.js');
const { getFriendListMiddleware } = require('./components/user/friendslist.js');
const { changeChatStatusMiddleware } = require('./components/user/chatstatus.js');
// trunk plugin
const { getUserAssetsMiddleware } = require('./components/trunk/userassets.js');
// recycled commands
const { handleSPMiddleware } = require('./components/recycled/sp.js');

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
// core plugin
tcpServer.use(registerUserMiddleware, 'u_reg'); // register user account
tcpServer.use(loginGuestUserMiddleware, 'a_lgu'); // login guest user
tcpServer.use(hostDetailsMiddleware, 'a_gsd'); // get host details
tcpServer.use(pluginsDetailsMiddleware, 'a_gpd'); // get plugin details
tcpServer.use(loginRegisteredUserMiddleware, 'a_lru'); // login registered user
tcpServer.use(heartbeatMiddleware, 'p'); // heartbeat ("ping")
// galaxy plugin
tcpServer.use(loadProfileVersionMiddleware, 'lpv'); // load profile version
tcpServer.use(versionStatistisMiddleware, 'vsu'); // version statistics
tcpServer.use(saveProfilePartMiddleware, 'spp'); // save profile part
// user plugin
tcpServer.use(changePhoneStatusMiddleware, 'u_cph'); // change phone status
tcpServer.use(getFriendListMiddleware, 'u_gbl'); // get friend (buddy) list
tcpServer.use(changeChatStatusMiddleware, 'u_ccs'); // change chat status
// trunk plugin
tcpServer.use(getUserAssetsMiddleware, 'gua'); // get user assets
// recycled commands
tcpServer.use(handleSPMiddleware, 'sp'); // handle sp command

// start listening for tcp connections
tcpServer.listen(config_server['tcp_port'], config_server['host'], () => {
    pretty.print('TCP server started on ' + config_server['host'] + ':' + config_server['tcp_port']);
});

// log http requests
app.use((req, res, next) => {
    pretty.request(req.method, req.headers['user-agent'], req.ip, req.url);
    next();
});
