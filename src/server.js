var express = require('express'),
    session = require('express-session'),
    api = require('./app/routes/api'),
    views = require('./app/routes/views'),
    nconf = require('nconf'),
    path = require('path'),
    bodyParser = require('body-parser'),
    app = express(),
    log4js = require("log4js"),
    yaml_config = require('node-yaml-config'),
    authentication = require("./app/routes/authentication"),
    logger = log4js.getLogger('Server');
require("colors");
require("./tools");
var testing = false;

nconf.argv()
   .env()
   .file({
     file: path.resolve(__dirname, '../config/config.yml' ),
     format: require('nconf-yaml')
   });

process.on('uncaughtException', function (err) {
  logger.error('Caught exception: ', err);
});

(function (ApplicationRoot) {
    "use strict";

    if (process.title === "Testing straw-manager API"){
      testing = true;
    } else {
      process.title = "straw-manager";
    }

    console.log(process.title.red.bold);

    ApplicationRoot.run = function(opts, callback) {
      if ( !opts ){
        opts = {};
      }
      var http_port = opts.port ? opts.port : nconf.get('port');

      if (opts.silent){
        log4js.configure({
            appenders : {
                console: {
                  type: 'console'
                }
            },
            categories: {
               default: 'ERROR',
               appenders: ['console']
            }
        });
      } else {
        var logOptions = yaml_config.load(path.resolve(__dirname, '../config/logger.yml'));

        // scribe logger
        if (nconf.get('scribe_logger:use')) {
          if (nconf.get('scribe_logger:version') === 3){
            const Scribe = require('scribe-js');
            const console = Scribe.create(yaml_config.load(path.resolve(__dirname, '../config/scribe-log.yml')));
            const scribeLogger = new Scribe.Middleware.ExpressRequestLogger(console);
            const viewer = new Scribe.Router.Viewer(console);

            logOptions.appenders['scribe'] = {
              type: 'logLevelFilter',
              level: 'INFO',
              appender: {
                type: path.resolve(__dirname, './logger/log4js-scribe3-js'),
                timezoneOffset: 'UTC+01:00',
              }
            };
            // express logger
            // app.use(scribeLogger.getMiddleware());
            // viewer
            app.use('/logs', viewer.getRouter());
          } else {
            const Scribe = require('scribe-js')();
            app.use('/logs', scribe.webPanel());
            app.use(scribe.express.logger());

            logOptions.appenders['scribe'] = {
              type: 'log4js-scribe-js',
              timezoneOffset: 'UTC+01:00',
              level: 'INFO'
            };
          }
        }

        console.log("configuring");
        try {
          log4js.configure(logOptions);
        } catch(err) {
          console.log(err);
        }
        console.log("configured");
      }

      if ( !opts || opts.run_server ) {
        app.use(session({
            secret: 'keyboard cat',
            proxy: true // if you do SSL outside of node.
        }));

        app.use('/api', api)

        app.set('views', path.join(__dirname, 'app/views'));
        app.set('view engine', 'pug');
        app.use(bodyParser.json());

        app.use('/public', express.static(path.join(__dirname + '/../public')));
        app.use('/', views);

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
