/*!
 * Optimix Aspiration
 * Author: Ahmed CHELBI <ahmad.chelbi@outlook.com>
 */

const path = require('path'),
  cp = require('child_process'),
  engine = require(path.resolve(__dirname, "./engine")),
  logger = require("log4js").getLogger('Interface');


(function (Interface) {
  "use strict";

  Interface.launch = function (input, eventEmitter) {
    logger.debug('launch aspiration update');
    return engine.start(input, eventEmitter);
  };

}(exports));
