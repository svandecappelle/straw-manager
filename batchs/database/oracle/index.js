/*jslint node: true */
'use strict';

var oracledb = require('oracledb'),
  nconf = require("nconf"),
  events = require('events'),
  logger = require('log4js').getLogger("Oracle");

logger.setLevel(nconf.get('logLevel'));

(function (Oracle) {
  Oracle.pool = null;
  oracledb.fetchAsString = [ oracledb.CLOB ];

  Oracle.eventBus = new events.EventEmitter();

  Oracle.on = function(eventName, callback){
    Oracle.eventBus.on(eventName, callback);
  };

  Oracle.emit = function(eventName, object){
    Oracle.eventBus.emit(eventName, object);
  };

  Oracle.init = function(callback){
    oracledb.createPool(nconf.get("database"), function(err, pool) {

        if (err) {
          logger.error("ERROR: ", new Date(), ": createPool() callback: " + err.message);
          return;
        }

        Oracle.pool = pool;
        Oracle.execute("SELECT * FROM TABUSR WHERE ID = :id", [1], function(err, result){
          if (err){
            logger.error("err: ", err, "result", result.rows);
          } else {
            logger.info("Well configured");
          }
          callback();
        });
    });
  };


  Oracle.execute = function(query, params, callback){
    var that = this;
    this.pool.getConnection(function(err, connection) {
      if (err) {
        logger.error(err.message);
        doClose(connection);
        return;
      }
      if (callback) {
        connection.execute(query, params, function(err, result){
          that.doClose(connection);
          callback(err, result, connection);
        });
      } else {
        callback = params;
        connection.execute(query, function(err, result){
          that.doClose(connection);
          callback(err, result, connection);
        });
      }
    });
  };

  Oracle.executeAndCommit = function(query, params, callback){
    var that = this;
    this.pool.getConnection(function(err, connection) {
      logger.debug("GETTING A CONNECTION OPENNED : " + that.pool.connectionsOpen + ' IN USE: ' + that.pool.connectionsInUse);

      if (err) {
        logger.error(err.message);
        that.doClose(connection);
        return;
      }
      if (callback) {
        connection.execute(query, params, function(err, result){
          if (err){
            that.doClose(connection);
            callback(err, result);
          } else {
            callback(err, result)
            logger.debug("COMMIT TRANSACTION");
            connection.commit(function(){
              that.doClose(connection);
            });
          }
        });
      } else {
        callback = params;
        connection.execute(query, function(err, result){
          if (err){
            that.doClose(connection);
            callback(err, result)
          } else {
            callback(err, result)
            logger.debug("COMMIT TRANSACTION");
            connection.commit(function(){
              that.doClose(connection);
            });
          }
        });
      }
    });
  };

  Oracle.doRelease = function(connection) {
    var that = this;
    logger.debug("CLOSING OPENNED CONNECTIONS: " + this.pool.connectionsOpen + ' IN USE: ' + this.pool.connectionsInUse);
    connection.release(function(err) {
      if (err) { logger.error(err.message); }
      logger.debug("CLOSED OPENNED CONNECTIONS: " + that.pool.connectionsOpen + ' IN USE: ' + that.pool.connectionsInUse);
    });
  }

  Oracle.doClose = function(connection, resultSet) {
    var that = this;
    if (resultSet){
      resultSet.close( function(err) {
        if (err) { logger.error(err.message); }
        that.doRelease(connection);
      });
    } else {
      that.doRelease(connection);
    }
  }
}(exports));
