var express = require('express'),
    routes = require('./app/routes/collect'),
    nconf = require('nconf'),
    app = express(),
    log4js = require("log4js"),
    logger = log4js.getLogger('Server');
require("colors");

var testing = false;

nconf.argv()
   .env()
   .file({ file: './config.json' });


(function (ApplicationRoot) {
    "use strict";

    if (process.title === "Testing CollectOnline API"){
      testing = true;
    } else {
      process.title = "Opti-CollectOnline";
    }

    console.log(process.title.red.bold);

    ApplicationRoot.run = function(opts, callback) {
      if ( !opts ){
        opts = {};
      }
      var http_port = opts.port ? opts.port : nconf.get('port');

      if (opts.silent){
        log4js.configure({
            appenders : [
                {type: 'console'}
            ],
            levels: {
               '[all]': 'ERROR'
            }
        });
      } else {
        if (process.argv[2] === "dev"){
          logger.info("entering dev mode");
          log4js.configure('logger-dev.json', {});
        } else {
          log4js.configure('logger.json', {});
        }
      }

      if ( !opts || opts.run_server ) {
        logger.debug("aspi" , nconf.get('aspiration'));
        app.use('/api', routes)

        logger.info("server is listening on port", "".concat(http_port).cyan);
        app.listen(http_port)
      }

      if (callback) {
        callback();
      }
    };

    if ( !testing ) {
      ApplicationRoot.run({
        run_server: true
      });
    }

})(exports);
