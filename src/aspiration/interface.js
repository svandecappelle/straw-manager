/*!
 * Optimix Aspiration
 * Author: Ahmed CHELBI <ahmad.chelbi@outlook.com>
 */

const path = require('path'),
  cp = require('child_process'),
  engine = require(path.resolve(__dirname, "./engine")),
  logger = require("log4js").getLogger('Server');


(function (Interface) {
  "use strict";

  Interface.update = function (input, callback) {
    // TODO: check meca
    logger.debug('launch aspiration update');
    var requestID = input.requestID
    var enseigne  = input.Enseigne
    var MagasinId = input.MagasinId
    var idProduit = input.idProduit
    var url       = input.url


    var script = path.resolve(__dirname, "./launch")
    logger.info(script, [enseigne, MagasinId, idProduit, url, requestID]);

    var child = cp.fork(script, [enseigne, MagasinId, idProduit, url, requestID], {silent:true});

    child.on('message', function(m) {
      // Receive results from child process
      logger.info('request executed: ', m.requestID);
      callback(m);
    });

    child.on('error', function error_callback(error) {
        logger.error('Error executing process: ', error);
    });

    child.on('close', function finished_launch(){
        logger.info('Script launch finished');
    });
  };

  Interface.launch = function (input, callback) {
      logger.debug('launch aspiration update');
      engine.start(input, callback);
  };

}(exports));