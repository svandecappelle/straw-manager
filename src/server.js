var express = require('express'),
    session = require('express-session'),
    api = require('./app/routes/api'),
    views = require('./app/routes/views'),
    nconf = require('nconf'),
    path = require('path'),
    bodyParser = require('body-parser'),
    app = express(),
    log4js = require("log4js"),
    authentication = require("./app/routes/authentication"),
    logger = log4js.getLogger('Server');
require("colors");
require("./tools");
var testing = false;

nconf.argv()
   .env()
   .file({
     file: path.resolve(__dirname, '../config.yml' ),
     format: require('nconf-yaml')
   });

process.on('uncaughtException', function (err) {
  logger.error('Caught exception: ', err);
});

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
          log4js.configure(path.resolve(__dirname, '../logger-dev.json'), {});
        } else {
          log4js.configure(path.resolve(__dirname, '../logger.json'), {});
        }
      }

      if ( !opts || opts.run_server ) {
        app.use(session({
            secret: 'keyboard cat',
            proxy: true // if you do SSL outside of node.
        }));

        logger.debug("aspi" , nconf.get('aspiration'));
        app.use('/api', api)

        app.set('views', path.join(__dirname, 'app/views'));
        app.set('view engine', 'pug');
        app.use(bodyParser.json());
        console.log(path.join(__dirname + '/../public'));

        app.use('/public', express.static(path.join(__dirname + '/../public')));
        app.use('/', views);

        var scribe = require('scribe-js')();
        app.use('/logs', scribe.webPanel());

        authentication.initialize(app);
        authentication.load(app);

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
