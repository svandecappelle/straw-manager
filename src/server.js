var express = require('express'),
    routes = require('./app/routes/collect'),
    nconf = require('nconf'),
    app = express(),
    log4js = require("log4js"),
    logger = log4js.getLogger('Server');
nconf.argv()
   .env()
   .file({ file: './config.json' });


process.title = "Optimix-CollectOnline";
if (process.argv[2] === "dev"){
  logger.info("entering dev mode");
  log4js.configure('logger-dev.json', {});
} else {
  log4js.configure('logger.json', {});
}

var http_port = nconf.get('port-http') ? nconf.get('port-http'): 3001

logger.debug("aspi" , nconf.get('aspiration'));
app.use('/api', routes)

logger.info("server is listening on port", http_port);
app.listen(http_port)
