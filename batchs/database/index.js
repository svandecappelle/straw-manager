/*jslint node: true */
"use strict";

var nconf = require('nconf'),
  path = require('path'),
  primaryDBName = nconf.get('database')["type"],
  logger = require('log4js').getLogger('database'),
  async = require('async');

if (!primaryDBName) {
    logger.info('Database type not set! Run node app --setup');
    process.exit(1);
} else {
    var primaryDB = require(path.resolve(__dirname, './' + primaryDBName));
    primaryDB.init(function () {
        logger.info("well done configured database");
        primaryDB.emit('ready');
    });

    module.exports = primaryDB;
}
