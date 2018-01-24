/*jslint node: true */
var application_root = __dirname,
    express = require('express'),
    path = require('path'),
    http = require('http'),
    log4js = require("log4js"),
    app = express(),
    fs = require('fs'),
    os = require('os'),
    logger = require('log4js').getLogger('Server'),
    path = require('path'),
    pkg = require('./package.json'),
    nconf = require('nconf');

// TODO !important: Use consolidate to import multiple view engines

process.title = "Optimix-Product-Tracker";

if (process.argv[2] === "dev"){
  logger.info("entering dev mode");
  log4js.configure('logger-dev.json', {});

} else {
  log4js.configure('logger.json', {});
}

(function (ApplicationRoot) {
    "use strict";
    ApplicationRoot.preload = function () {
        nconf.argv().env();

        // Alternate configuration file support
        var configFile = __dirname + '/config.json',
            configExists;
        if (nconf.get('config')) {
            configFile = path.resolve(__dirname, nconf.get('config'));
        }
        configExists = fs.existsSync(configFile);

        if (!configExists){
            logger.error("configuration file doesn't exists");
            process.exit(1);
        } else {
            nconf.file({
                file: configFile
            });

            nconf.defaults({
                base_dir: __dirname
            });
        }

        return this;
    };

    ApplicationRoot.start = function (callback) {
        var bodyParser = require('body-parser'),
            session = require('express-session'),
            passport = require('passport');

        // public PATHS
        app.set('views', __dirname + '/src/app/views');
        app.set('view engine', 'jade');

        var engines = require('consolidate');
        app.engine('jade', engines.jade);
        app.engine('pug', engines.pug);

        app.use("/public", express.static(__dirname + '/public'));
        app.use(bodyParser());
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
          extended: true
        }));
        app.use(session({
            secret: 'keyboard cat',
            proxy: true // if you do SSL outside of node.
        }));
        var allowCrossDomain = function(req, res, next) {
            // res.header('Access-Control-Allow-Origin', '*');
            var origin = '*';
            if (req.headers.origin){
                origin = req.headers.origin;
            }
            // if(allowedOrigins   .indexOf(origin) > -1){
                res.setHeader('Access-Control-Allow-Origin', origin);
            // }
            res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
            res.header('Access-Control-Allow-Headers', 'Content-Type');
            res.header('Access-Control-Allow-Credentials', true);
            next();
        }
        app.use(allowCrossDomain);

        app.use(passport.initialize());
        app.use(passport.session());
        /*
        var httplog = morgan(':req[X-Forwarded-For] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"', {
          "stream": {
            write: function(str) {
              logger.debug(str.trim());
            }
          }
        });
        app.use(httplog);
        */

        // ROUTES
        var strawManager = require("./index");
        strawManager.load(app, {
            rootPath: '/straw-manager',
            create_authority: true
        }, function(viewsPath){
          // TODO load views

          logger.info(`Application dependent straw-manager loaded views path: ${viewsPath}`);

        });

        process.on('SIGINT', function () {
            logger.info("Stopping server");
            application.close();
            logger.info("Server stopped");
            process.exit(0);
        });

        app.listen(8080);
    };

    if (process.window === undefined){
      ApplicationRoot.preload().start();
    }
}(exports));
