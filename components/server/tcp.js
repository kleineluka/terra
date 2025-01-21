// imports
const net = require('net');
const pretty = require('./../utils/pretty.js');
const { parseStringPromise } = require('xml2js');

class TCPServer {

    constructor() {
        this.middleware = [];
    }

    // add middleware to the chain
    use(fn) {
        this.middleware.push(fn);
    }

    // run middleware chain
    runMiddleware(socket, commandInfo, done) {
        let index = 0;
        const next = (err) => {
            if (err) return done(err);
            const middlewareFn = this.middleware[index++];
            if (middlewareFn) {
                middlewareFn(socket, commandInfo, next);
            } else {
                done(); // end of chain
            }
        };
        next(); // start the chain
    }

    // parse received message into individual commands (separated by null byte)
    parseReceivedMessage(message) {
        return message.toString().split('\0').filter(cmd => cmd.trim() !== '');
    }

    // parse a command into its parts
    async parseCommand(command) {
        const commandInfo = [];
        let routingString = '';

        // check for routing string (ends with '#')
        if (command.endsWith('#')) {
            routingString = command.substring(
                command.lastIndexOf('>') + 1,
                command.lastIndexOf('#')
            );
            command = command.substring(0, command.lastIndexOf('>') + 1);
        }

        // wrap it in a root element then prase
        const wrappedCommand = `<A1Command>${command}</A1Command>`;
        const parsedXML = await parseStringPromise(wrappedCommand);

        // extract command root name
        const root = parsedXML.A1Command[Object.keys(parsedXML.A1Command)[0]];
        commandInfo.push(Object.keys(parsedXML.A1Command)[0]);

        // extract attributes and descendants
        const extractAttributes = (element) => {
            if (element.$) {
                for (const value of Object.values(element.$)) {
                    commandInfo.push(value);
                }
            }
        };

        extractAttributes(root);
        if (root && root.length) {
            for (const child of root) {
                extractAttributes(child);
            }
        }

        // append routing string if present
        if (routingString) {
            commandInfo.push(...routingString.split('|'));
        }

        return commandInfo;
    }

    // parse routing information from a command
    parseRoutingStrings(command) {
        let routingString = '';

        // extract routing string if command ends with '#'
        if (command.endsWith('#')) {
            routingString = command.substring(
                command.lastIndexOf('>') + 1,
                command.lastIndexOf('#')
            );
        }

        return routingString ? routingString.split('|') : []
    }

    // start the tcp server
    listen(port, host, callback) {
        const server = net.createServer((socket) => {
            pretty.print(`TCP connection established from ${socket.remoteAddress}:${socket.remotePort}`);

            // on incoming data
            socket.on('data', (data) => {

                // step one: parse incoming data into commands
                const commands = this.parseReceivedMessage(data);

                commands.forEach((command) => {

                    // step two: parse command info and routing
                    const commandInfo = {
                        fullCommand: command,
                        parts: this.parseCommand(command),
                        routing: this.parseRoutingStrings(command)
                    };

                    // step three: run middleware chain
                    this.runMiddleware(socket, commandInfo, (err) => {
                        if (err) {
                            pretty.error(`Error in middleware: ${err.message}`);
                            socket.write('Error: ' + err.message);
                            return;
                        }
                        // no middleware handled the response
                        socket.write(`Command processed: ${commandInfo.fullCommand}`);
                    });
                });
            });

            // on socket disconnection
            socket.on('close', () => {
                pretty.print(`Connection closed: ${socket.remoteAddress}:${socket.remotePort}`);
            });

            // on socket error
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
