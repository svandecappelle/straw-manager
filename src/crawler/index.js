const path = require('path');
const engineLauncher = require('./launcher');
const logger = require('log4js').getLogger('Crawler');

class Crawler {

  launch (input, eventEmitter) {
    logger.debug('launch crawler');
    return engineLauncher.start(input, eventEmitter);
  }

}

module.exports = new Crawler()