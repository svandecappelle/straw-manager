(function (ImportServer) {
  "use strict";

  require("colors");

  var logger = require('log4js').getLogger('CollectOnlineDependentImportServer'),
    nconf = require('nconf'),
    path = require('path'),
    express = require('express');

  ImportServer.load = function(app, opts, callback) {

    var api = require(path.join(__dirname, './src/app/routes/api')),
      views = require(path.join(__dirname,'./src/app/routes/views')),
      authentication = require(path.join(__dirname,"./src/app/routes/authentication"));

    nconf.overrides({
      'CollectOnlineRootPath': opts.rootPath
    });

    logger.info("Aspiration server loading", nconf.get('aspiration'));
    app.use(opts.rootPath + '/api', api)

    if (app.get('views')){
      app.set('views', [app.get('views'), path.join(__dirname, 'src/app/views')]);
    } else {
      app.set('views', path.join(__dirname, 'src/app/views'));

    }

    // app.set('view engine', 'pug');
    console.log(path.join(__dirname + '/public'));
    app.use(opts.rootPath + '/public', express.static(path.join(__dirname + '/public')));
    app.use(opts.rootPath, views);

    if (opts.create_authority){
      authentication.initialize(app);
      authentication.load(app);
    }

    /*
      authentication.initialize(app);
      authentication.load(app);
    */
    logger.info("application routes are loaded".cyan);
    if (callback) {
      callback(__dirname);
    }
  };

})(exports);
