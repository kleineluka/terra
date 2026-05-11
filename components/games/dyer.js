const pretty = require('../utils/pretty.js');
const response = require('../utils/response.js');

const TURN_TIMEOUT_MS = 30000;

// resolved lazily so the global config is available at call time
function pid() { return String(config_plugins.dyer); }

// matchmaking state
const matchQueue = []; // { socket, prStr, bid }
const activeMatches = new Map(); // bid -> { p1, p2, readyCount, turn, paCount }

let nextBid = 1;

function generateBid() { return String(nextBid++); }

function removeFromQueue(socket) {
    const idx = matchQueue.findIndex(e => e.socket === socket);
    if (idx !== -1) matchQueue.splice(idx, 1);
}

function opponent(match, socket) {
    return match.p1 === socket ? match.p2 : match.p1;
}

function sendToMatch(match, tag, attrs, inner = '') {
    const PID = pid();
    const bid = match.bid;
    match.p1.write(response.createChatResponseXml(tag, attrs, inner, PID, bid));
    match.p2.write(response.createChatResponseXml(tag, attrs, inner, PID, bid));
}

function sendTurnTimers(match) {
    const PID = pid();
    const bid = match.bid;
    // the active player gets pt (your turn), the waiting player gets ot (opponent's turn)
    match.turn.write(response.createChatResponseXml('pt', { t: String(TURN_TIMEOUT_MS) }, '', PID, bid));
    opponent(match, match.turn).write(response.createChatResponseXml('ot', { t: String(TURN_TIMEOUT_MS) }, '', PID, bid));
}

function endMatch(match) {
    clearTimeout(match.turnTimer);
    activeMatches.delete(match.bid);
    match.p1.dyerMatchBid = null;
    match.p2.dyerMatchBid = null;
}

function handleDyerDisconnect(socket) {
    removeFromQueue(socket);
    const bid = socket.dyerMatchBid;
    if (!bid || !activeMatches.has(bid)) return;
    const match = activeMatches.get(bid);
    const opp = opponent(match, socket);
    if (opp && !opp.destroyed) {
        opp.write(response.createChatResponseXml('go', { r: '3' }, '', pid(), bid));
    }
    endMatch(match);
}

// jn - matchmake or queue the player
async function joinDyerGameMiddleware(socket, commandInfo, next) {
    const incomingBid = commandInfo.routing[3] || '0';
    const prStr = commandInfo.attrs.pr || '';
    const currentUser = socket.userWristband;
    const PID = pid();

    pretty.print(`Dyer 'jn': player=${currentUser.username} pr="${prStr}"`, 'DEBUG');

    const waitingIdx = matchQueue.findIndex(e => e.socket !== socket);

    if (waitingIdx !== -1) {
        const waiting = matchQueue.splice(waitingIdx, 1)[0];
        const bid = generateBid();
        const p1 = waiting.socket;
        const p2 = socket;

        const match = { bid, p1, p2, readyCount: 0, turn: p1, paCount: 0, turnTimer: null };
        activeMatches.set(bid, match);
        p1.dyerMatchBid = bid;
        p2.dyerMatchBid = bid;

        p1.write(response.createChatResponseXml('jn', { r: '0', bid }, '', PID, '0'));
        p2.write(response.createChatResponseXml('jn', { r: '0', bid }, '', PID, incomingBid));

        p1.write(response.createChatResponseXml('oj', { n: p2.userWristband.username }, '', PID, bid));
        p2.write(response.createChatResponseXml('oj', { n: p1.userWristband.username }, '', PID, bid));

        pretty.print(`Dyer match created. BID=${bid} (${p1.userWristband.username} vs ${p2.userWristband.username})`);
    } else {
        const bid = generateBid();
        matchQueue.push({ socket, prStr, bid });
        socket.dyerMatchBid = bid;

        socket.write(response.createChatResponseXml('jn', { r: '0', bid }, '', PID, incomingBid));
        pretty.print(`Dyer: ${currentUser.username} queued. BID=${bid}`);
    }

    return next();
}

// fp - client requests the game SWF path
async function filePathDyerMiddleware(socket, commandInfo, next) {
    if (commandInfo.routing[1] !== pid()) return next();

    const bid = commandInfo.attrs.bid || socket.dyerMatchBid || '0';
    const gameUrl = `http://${config_server.host}:${config_server.port}/games/`;
    socket.write(response.createChatResponseXml('fp', { p: gameUrl }, '', pid(), bid));
    pretty.print(`Dyer 'fp': sent game path to ${socket.userWristband.username}`, 'DEBUG');
    return next();
}

// rp - client signals its SWF finished loading; start the match when both are ready
async function readyDyerMiddleware(socket, commandInfo, next) {
    if (commandInfo.routing[1] !== pid()) return next();

    const bid = commandInfo.attrs.bid || socket.dyerMatchBid;
    if (!bid || !activeMatches.has(bid)) return next();

    const match = activeMatches.get(bid);
    match.readyCount++;
    pretty.print(`Dyer 'rp': ${socket.userWristband.username} ready (${match.readyCount}/2). BID=${bid}`, 'DEBUG');

    if (match.readyCount >= 2) {
        match.p1.write(response.createChatResponseXml('sg', { t: '10000', p: '0' }, '', pid(), bid));
        match.p2.write(response.createChatResponseXml('sg', { t: '10000', p: '1' }, '', pid(), bid));
        // TODO: send ts (tile setup) board string here once encoding is confirmed
        sendTurnTimers(match);
        pretty.print(`Dyer match ${bid} started.`);
    }

    return next();
}

// tr - client removed a tile pair; relay to opponent and switch turns
async function tileRemoveDyerMiddleware(socket, commandInfo, next) {
    if (commandInfo.routing[1] !== pid()) return next();

    const bid = commandInfo.attrs.bid || socket.dyerMatchBid;
    if (!bid || !activeMatches.has(bid)) return next();

    const match = activeMatches.get(bid);
    const opp = opponent(match, socket);

    // build the relay XML from the raw child tile nodes
    const tileNodes = (commandInfo.childAttrs.t || [])
        .map(t => `<t x="${t.x}" y="${t.y}" z="${t.z}" />`)
        .join('');
    const innerXml = tileNodes;
    opp.write(response.createChatResponseXml('tr', {}, innerXml, pid(), bid));

    // switch active turn
    match.turn = opp;
    sendTurnTimers(match);

    pretty.print(`Dyer 'tr': ${socket.userWristband.username} removed tiles. Turn → ${opp.userWristband.username}. BID=${bid}`, 'DEBUG');
    return next();
}

// lv - client leaves the match mid-game
async function leaveDyerMiddleware(socket, commandInfo, next) {
    if (commandInfo.routing[1] !== pid()) return next();

    const bid = commandInfo.attrs.bid || socket.dyerMatchBid;
    if (!bid || !activeMatches.has(bid)) return next();

    const match = activeMatches.get(bid);
    const opp = opponent(match, socket);

    // r=3: opponent quit
    if (opp && !opp.destroyed) {
        opp.write(response.createChatResponseXml('go', { r: '3' }, '', pid(), bid));
    }
    // r=0: you quit (lose)
    socket.write(response.createChatResponseXml('go', { r: '0' }, '', pid(), bid));

    pretty.print(`Dyer 'lv': ${socket.userWristband.username} left match BID=${bid}.`);
    endMatch(match);
    return next();
}

// pa - play again; start a rematch when both players agree
async function playAgainDyerMiddleware(socket, commandInfo, next) {
    if (commandInfo.routing[1] !== pid()) return next();

    const bid = commandInfo.attrs.bid || socket.dyerMatchBid;
    if (!bid || !activeMatches.has(bid)) return next();

    const match = activeMatches.get(bid);
    match.paCount++;
    pretty.print(`Dyer 'pa': ${socket.userWristband.username} wants rematch (${match.paCount}/2). BID=${bid}`, 'DEBUG');

    // relay the request to the opponent so their UI can prompt them
    opponent(match, socket).write(response.createChatResponseXml('pa', { bid }, '', pid(), bid));

    if (match.paCount >= 2) {
        // reset match state and restart
        match.readyCount = 0;
        match.paCount = 0;
        match.turn = match.p1;
        sendToMatch(match, 'sg', { t: '10000', p: '0' });
        // TODO: send fresh ts board here once encoding is confirmed
        sendTurnTimers(match);
        pretty.print(`Dyer match ${bid} restarted.`);
    }

    return next();
}

// ms - in-game chat message; relay to the opponent with the sender's name
async function messageDyerMiddleware(socket, commandInfo, next) {
    if (commandInfo.routing[1] !== pid()) return next();

    const bid = commandInfo.attrs.bid || socket.dyerMatchBid;
    if (!bid || !activeMatches.has(bid)) return next();

    const match = activeMatches.get(bid);
    const msg = commandInfo.attrs.m || '';
    const name = socket.userWristband.username;
    opponent(match, socket).write(response.createChatResponseXml('ms', { n: name, m: msg }, '', pid(), bid));
    pretty.print(`Dyer 'ms': ${name} → "${msg}" BID=${bid}`, 'DEBUG');
    return next();
}

module.exports = {
    joinDyerGameMiddleware,
    filePathDyerMiddleware,
    readyDyerMiddleware,
    tileRemoveDyerMiddleware,
    leaveDyerMiddleware,
    playAgainDyerMiddleware,
    messageDyerMiddleware,
    handleDyerDisconnect,
};
