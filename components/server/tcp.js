// imports
const net = require('net');
const pretty = require('./../utils/pretty.js');
const { parseStringPromise } = require('xml2js');
const { registerConnection, unregisterConnection } = require('../utils/connections.js');

class TCPServer {

    constructor() {
        this.middleware = [];
        this.disconnectHandlers = [];
    }

    // add middleware to the chain
    use(fn, commandFilter = null) {
        this.middleware.push({ fn, commandFilter });
    }

    // register a handler called when a socket closes (for cleanup)
    onDisconnect(fn) {
        this.disconnectHandlers.push(fn);
    }

    // run middleware chain
    async runMiddleware(socket, commandInfo, done) {
        let index = 0;
        let handled = false;

        // ensure commandInfo is resolved before proceeding
        const resolvedCommandInfo = await Promise.resolve(commandInfo).catch((err) => {
            console.error('Error resolving commandInfo:', err);
            return null;
        });

        if (!resolvedCommandInfo) {
            return done(new Error('Invalid commandInfo: Unable to resolve'));
        }

        const next = (err) => {
            if (err) return done(err);
            const middlewareObj = this.middleware[index++];
            if (middlewareObj) {
                const { fn, commandFilter } = middlewareObj;
                //console.log(`Processing Middleware: ${index}`);
                //console.log('Command Info:', resolvedCommandInfo.parts);
                //console.log('Command Filter:', commandFilter);
                if (!commandFilter || commandFilter === resolvedCommandInfo.parts[0]) {
                    handled = true;
                    fn(socket, resolvedCommandInfo, next);
                } else {
                    //console.log(`Skipping Middleware: ${index}`);
                    next(); // skip to the next middleware
                }
            } else {
                if (!handled) {
                    pretty.error('No middleware handled the command \"' + resolvedCommandInfo.parts[0] + '\"');
                }
                //console.log('End of Middleware Chain');
                done();
            }
        };

        next();
    }

    // parse received message into individual commands (separated by null byte)
    parseReceivedMessage(message) {
        return message.toString().split('\0').filter(cmd => cmd.trim() !== '');
    }

    // parse a command into its parts, top-level attrs, and child element attrs
    async parseCommand(command) {
        const parts = [];
        let routingString = '';
        let attrs = {};
        const childAttrs = {};

        console.log(command);

        // check for routing string (ends with '#')
        if (command.endsWith('#')) {
            routingString = command.substring(
                command.lastIndexOf('>') + 1,
                command.lastIndexOf('#')
            );
            command = command.substring(0, command.lastIndexOf('>') + 1);
        }

        // wrap it in a root element then parse
        const wrappedCommand = `<A1Command>${command}</A1Command>`;
        const parsedXML = await parseStringPromise(wrappedCommand);

        // extract command root name
        const rootKey = Object.keys(parsedXML.A1Command)[0];
        parts.push(rootKey);

        const root = parsedXML.A1Command[rootKey];

        if (root && root.length) {
            const firstChild = root[0];

            // extract root element's own attributes (e.g. t, id on <jn>)
            if (firstChild.$) {
                attrs = firstChild.$;
                for (const value of Object.values(firstChild.$)) {
                    parts.push(value);
                }
            }

            // extract child element attributes (e.g. <pr> inside <jn>)
            for (const [key, value] of Object.entries(firstChild)) {
                if (key === '$' || !Array.isArray(value)) continue;
                childAttrs[key] = [];
                for (const grandchild of value) {
                    if (grandchild.$) {
                        childAttrs[key].push(grandchild.$);
                        for (const v of Object.values(grandchild.$)) {
                            parts.push(v);
                        }
                    }
                }
            }
        }

        // append routing string if present
        if (routingString) {
            parts.push(...routingString.split('|'));
        }

        // debug print out
        pretty.print(`New TCP Command: ${parts.join(' | ')}`, 'DEBUG');

        return { parts, attrs, childAttrs };
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
            registerConnection(socket);
            pretty.print(`TCP connection established from ${socket.remoteAddress}:${socket.remotePort}`);

            // on incoming data
            socket.on('data', async (data) => {
                // step one: parse incoming data into commands
                const commands = this.parseReceivedMessage(data);

                for (const command of commands) {
                    try {
                        // step two: parse command info and routing 
                        const parsed = await this.parseCommand(command);
                        const routing = this.parseRoutingStrings(command); 

                        const commandInfo = {
                            fullCommand: command,
                            parts: parsed.parts,
                            attrs: parsed.attrs,
                            childAttrs: parsed.childAttrs,
                            routing
                        };

                        // step three: run middleware chain
                        this.runMiddleware(socket, commandInfo, (err) => {
                            if (err) {
                                pretty.error(`Error in middleware: ${err.message}`);
                                return;
                            }
                        });
                    } catch (err) {
                        pretty.error(`Error processing command: ${err.message}`);
                    }
                }
            });

            // on socket disconnection
            socket.on('close', () => {
                unregisterConnection(socket);
                this.disconnectHandlers.forEach(fn => fn(socket));
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
