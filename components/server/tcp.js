// imports
const net = require('net');
const pretty = require('./../utils/pretty.js');

class TCPServer {
    
    constructor() {
        this.middleware = [];
    }

    // add to the middleware chain
    use(fn) {
        this.middleware.push(fn);
    }

    // run middleware chain
    runMiddleware(socket, data, done) {
        let index = 0;
        const next = (err) => {
            if (err) return done(err);
            const middlewareFn = this.middleware[index++];
            if (middlewareFn) {
                middlewareFn(socket, data, next);
            } else {
                done(); // end of chain
            }
        };
        next(); // start the chain
    }

    // start the TCP server
    listen(port, host, callback) {
        const server = net.createServer((socket) => {
            pretty.print(`TCP connection established from ${socket.remoteAddress}:${socket.remotePort}`);

            // receive data from client 
            socket.on('data', (data) => {
                this.runMiddleware(socket, data, (err) => {
                    if (err) {
                        pretty.error(`Error in middleware: ${err.message}`);
                        socket.write('Error: ' + err.message);
                        return;
                    }
                    // final response if no middleware handles it
                    socket.write('Request processed successfully.');
                });
            });
            
            // handle client disconnection
            socket.on('close', () => {
                pretty.print(`Connection closed: ${socket.remoteAddress}:${socket.remotePort}`);
            });

            // handle socket errors
            socket.on('error', (err) => {
                pretty.error(`Socket error: ${err.message}`);
            });
        });

        // start the server
        server.listen(port, host, () => {
            if (callback) callback();
        });

    }
}

module.exports = {
    TCPServer
};