// imports
const sqlite3 = require('sqlite3').verbose();
const pretty = require('./pretty.js');

// create database
const db = new sqlite3.Database(config_database[file]);

// function to initialize the database
function initialize() {
    // create the database if it doesn't exist
}