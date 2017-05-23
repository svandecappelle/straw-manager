var events = require('events'),
  request = require('request'),
  _ = require('underscore'),
  logger = require('log4js').getLogger('Engine'),
  path = require('path'),
  fs = require('fs'),
  yaml_config = require('node-yaml-config');

function config_name(name){
  return path.resolve(__dirname, "./../../aspiration/config/".concat(name).concat(".").concat("yml"));
}


function Engine () {
  events.EventEmitter.call(this);
  this.config = yaml_config.load(config_name("global"));
  if (this.name){
    var config_path = config_name("sites/" + this.name);
    if (fs.existsSync(config_path)){
        _.extend(this.config, yaml_config.load(config_path));
    } else {
        logger.warn(`Configuration file ${config_path} not existing skipping loading`);
    }
    logger.info("Configuration: ", this.config);
  }
};

Engine.prototype.__proto__ = events.EventEmitter.prototype;

Engine.prototype.request = function (req, viewtype) {
  var that = this;
  // console.log(that);
  if (this.use_proxy && !this.isProxyConnected()){
    this.proxy_connect(req, viewtype);
  } else {
    request.get(req.url, {
      time: true
    }, function(error, response, body){
      that.onResult(error, response, body, viewtype, req);
    });
  }
};

Engine.prototype.onResult = function (error, response, body, viewtype, req) {
  console.log("Request take: ".concat(req.url).concat(" ---> "+ response.elapsedTime).concat(" ms").red);
  // console.log(req);
  if ( !viewtype ){
    this.decode(body, req);
  } else {
      this.emit(viewtype, body, req);
  }
};

Engine.prototype.isProxyConnected = function(){
  return this.proxy !== undefined;
};

Engine.prototype.proxy_connect = function (req, viewtype) {
  console.log("Using proxy".red.bold);
  request = request.defaults({'proxy': 'http://188.68.0.253:8085'})
  this.proxy = 'http://188.68.0.253:8085'
  this.request(req, viewtype);
};

module.exports = Engine;
