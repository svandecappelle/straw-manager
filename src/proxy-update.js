var request = require('request'),
    fs = require('fs'),
    logger = require("log4js").getLogger('proxy-update'),
    path = require('path');
(function (Proxy) {
  "use strict";

    Proxy.update = function (opts, eventEmitter) {
      request({
        url: 'http://account.fineproxy.org/api/getproxy',
        qs: {
          format: 'txt',
          type: 'httpip',
          //login: 'SuperVIP205927',
          //password: 'pVzLRAIuSD'
          login: 'SuperVIP241409',
          password: 'wClqD67BiX '
        }
      }, (error, _ , body) => {
        if (!error) {
          fs.writeFileSync(path.resolve(__dirname, '../sharedProxy'), body);
          fs.writeFileSync(path.resolve(__dirname, '../proxyRU.txt'), body);
          logger.info('proxy update ok');
        } else {
          logger.error('proxy update failed', error);
        }
      });
    }

}(exports));
