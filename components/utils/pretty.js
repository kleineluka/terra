// imports used here
const chalk = require('chalk');

// make text coloured
const header_styling = {
    'LOGS': chalk.magentaBright,
    'DEBUG': chalk.magenta,
    'DEBUG ALWAYS': chalk.green,
    'DEBUG GATED': chalk.blueBright,
    'ERROR': chalk.redBright,
    "TIMESTAMP": chalk.yellowBright,
    "DIRECTION": chalk.greenBright,
    "SOLUTIONS": chalk.cyan,
    "REQUEST": chalk.blue,
    "REDIRECT": chalk.yellowBright,
    "DATABASE": chalk.cyanBright,
    'ACTION': chalk.greenBright,
    'WARN': chalk.yellowBright,
};

const request_styling = {
    'GET': chalk.greenBright.bold,
    'POST': chalk.blueBright.bold,
    'PUT': chalk.yellowBright.bold,
    'DELETE': chalk.redBright.bold,
    "URL": chalk.cyan.bold,
    "IP": chalk.magenta.bold,
    "USERAGENT": chalk.yellow,
};

// rainbow-ify text
function pretty_rainbow(msg) {
    // declare the colors
    let color_range = [chalk.red, chalk.yellow, chalk.green, chalk.blue, chalk.magenta, chalk.cyan];
    // for each letter in the message
    let rainbow = '';
    for (let i = 0; i < msg.length; i++) {
        // add the letter in the color
        rainbow += color_range[i % color_range.length](msg[i]);
    }
    // return the rainbow
    return rainbow;
}

// print but... pretty !
function print(msg, source = 'LOGS', append = '') {
    var header = '[';
    header += pretty_rainbow(config_server['name']) + ' @ ';
    var date = new Date();
    let formatted_date = (date.getHours() < 10 ? '0' : '') + date.getHours();
    let formatted_append = 'AM';
    if (formatted_date > 12) {
        formatted_date -= 12;
        formatted_append = 'PM';
    }
    formatted_date += ':' + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    formatted_date += ':' + (date.getSeconds() < 10 ? '0' : '') + date.getSeconds();
    formatted_date += ' ' + formatted_append;
    header += header_styling['TIMESTAMP'](formatted_date) + '] -> ';
    header += header_styling[source](source) + ': ';
    header = '\x1b[1m' + header + '\x1b[0m' + msg;
    header += append;
    console.log(header); // ta-da!
}

// debug too..
function debug(msg) {
    print(msg, config_server['debug'], 'DEBUG ALWAYS');
}

// only sometimes print
function gated(msg, extra_flag) {
    print(msg, config_server['debug'] && extra_flag, 'DEBUG GATED');
}

// and i guess make the errors pretty (and colored) too
function error(msg, error = null, sol = null) {
    let append_msg = '';
    if (sol != null) {
        append_msg += header_styling['DIRECTION'](' -> ') + 'But no fear! Here are some solutions.';
        let solutions = require('../../i18n/solutions.json');
        let solution_items = Object.keys(solutions['database']);
        for (let i = 0; i < solution_items.length; i++) {
            let solutionKey = solution_items[i];
            append_msg += '\n   ' + header_styling['DIRECTION'](" -> ") + header_styling['SOLUTIONS'](i + 1 + '. ') + solutions['database'][solutionKey];
        }
    }
    if (config_server['debug'] && error != null) {
        append_msg += '\n' + header_styling['DEBUG ALWAYS']("DEBUG ENABLED") + header_styling['DIRECTION'](" -> ") + header_styling['ERROR'](error);
    }
    print(msg, 'ERROR', append_msg);
}

// requests
function request(kind, user_agent, ip, url) {
    if (kind == null || user_agent == null || ip == null || url == null) return;
    kind = request_styling[kind](kind);
    user_agent = 'UA: ' + request_styling['USERAGENT'](user_agent);
    ip = 'IP @ ' + request_styling['IP'](ip);
    url = request_styling['URL'](url);
    let msg = 'Recieving a ' + kind + ' request from ' + ip + ' (' + user_agent + ') for ' + url + '.';
    if (config_server['debug']) {
        print(msg, 'REQUEST');
    }
}

// export the functions
module.exports = {
    print,
    debug,
    gated,
    error,
    request
};