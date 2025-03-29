// imports
const sqlite3 = require('sqlite3').verbose();
const pretty = require('../utils/pretty.js');

// create database connection
const db = new sqlite3.Database(global.config_database['file_path'], (err) => {
    if (err) {
        pretty.error(`Failed to connect to SQLite: ${err.message}`);
    } else {
        pretty.print('Connected to SQLite database');
    }
});

// function to initialize the database
function initialize() {

    // table: users
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            security_question TEXT,
            security_answer TEXT,
            phone_status INTEGER DEFAULT 0,
            chat_status INTEGER DEFAULT 0,
            connection_id VARCHAR(50) DEFAULT NULL,
            is_online INT DEFAULT NULL,
            friend_list VARCHAR(100) DEFAULT NULL,
            transaction_count INT DEFAULT NULL,
            transaction_history MEDIUMTEXT DEFAULT NULL,
            jammers_total INT DEFAULT NULL,
            jammers_used INT DEFAULT NULL
        );
    `;

    // create the users table
    db.run(createUsersTable, (err) => {
        if (err) {
            pretty.error(`Error creating users table: ${err.message}`);
        } else {
            pretty.print('Users table initialized!', 'DATABASE');
            // reset all users' online status to offline if the table already exists
            const resetStatuses = `
                UPDATE users 
                SET phone_status = 0, chat_status = 0, connection_id = NULL, is_online = 0
            `;
            db.run(resetStatuses, (err) => {
                if (err) {
                    pretty.error(`Error resetting user statuses: ${err.message}`);
                } else {
                    pretty.print('User statuses reset to offline (presumably due to server start-up).', 'DATABASE');
                }
            });
        }
    });

}

// function to run SQL queries with parameters
function runQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) {
                pretty.error(`Database query error: ${err.message}`);
                return reject(err);
            }
            resolve(this.lastID);
        });
    });
}

// function to get data with parameters
function getQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) {
                pretty.error(`Database query error: ${err.message}`);
                return reject(err);
            }
            resolve(row);
        });
    });
}

// function to close the database connection
function close() {
    db.close((err) => {
        if (err) {
            pretty.error(`Error closing the database: ${err.message}`);
        } else {
            pretty.print('Database connection closed');
        }
    });
}

module.exports = {
    initialize,
    runQuery,
    getQuery,
    close,
};