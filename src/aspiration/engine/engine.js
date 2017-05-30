var events = require('events'),
  // request = require('request'),
  needle = require('needle'),
  _ = require('underscore'),
  logger = require('log4js').getLogger('Engine'),
  path = require('path'),
  nconf = require('nconf'),
  merge = require('merge-object'),
  fs = require('fs'),
  yaml_config = require('node-yaml-config');

function config_name(name){
  return path.resolve(__dirname, "./../../aspiration/config/".concat(name).concat(".").concat("yml"));
}

function Engine () {
  events.EventEmitter.call(this);
  this.config = yaml_config.load(config_name("global"));
  this.cookies = {};
  if (this.name){
    var config_path = config_name("sites/" + this.name);
    if (fs.existsSync(config_path)){
        _.extend(this.config, yaml_config.load(config_path));
    } else {
        logger.warn(`Configuration file ${config_path} not existing skipping loading`);
    }
    logger.debug("Configuration: ", this.config);
  }

  this.on('cookies', this.parse_cookies);
};

Engine.prototype.__proto__ = events.EventEmitter.prototype;

Engine.prototype.parse_cookies = function (req, cookies) {
  logger.warn("Getting cookies: ", req.url, cookies);
};

Engine.prototype.request = function (req, viewtype) {
  var that = this;

  // console.log(that);
  logger.warn("Using proxy check: ", req, this.use_proxy);
  var options = {};
  if (this.use_proxy && !this.isProxyConnected()){
    options = this.proxy_connect(req, viewtype);
  }

  if (req.cookies){
    options.cookies = merge(req.cookies, that.cookies);
  }

  logger.info("using opts : ", options);
  needle.get(req.url, options, function(error, response, body){
    if (response){
      if (response.cookies){
        var cookies = response.cookies;
        that.emit("cookies", req, cookies);
        that.cookies = merge(that.cookies, cookies);
        logger.warn(req.url, cookies, that.cookies, req.cookies);
      }
    }
    that.onResult(error, response, body, viewtype, req);
  }).on('error', function(err){
    logger.error("Error on calling request engine", err);
    if (that.current_try >= that.config.maxtry){
      that.emit("fatal_error", err, req);
    }
  });
};

Engine.prototype.onResult = function (error, response, body, viewtype, req) {
  if (error){
    if ( !this.current_try ){
      this.current_try = 1;
    }
    this.current_try += 1;
    console.log(`\r\nRetry ${this.current_try} / ${this.config.maxtry}`);
    if (error.code === 'ETIMEDOUT'){

      if (this.current_try > this.config.maxtry){
        logger.info(`Maximum number of tries [${this.current_try} / ${this.config.maxtry}]. Request marked as failed`, req);
        this.emit("fatal_error", error, req);
      } else {
        logger.info(`Connection to proxy ${this.proxy} timed out trying another one.`);
        return this.proxy_connect(req, viewtype);
      }

    } else {
      if (this.current_try > this.config.maxtry){
        logger.info(`Maximum number of tries [${this.current_try}]. Request marked as failed`, req);
        this.emit("fatal_error", error, req);
      } else {
        logger.info(`Connection to proxy ${this.proxy} timed out trying another one.`);
        return this.proxy_connect(req, viewtype);
      }

    }
  } else {
    this.current_try = 1;
    var duration = Date.now() - req.requestDate;
    req.duration = duration;
    console.log("\rRequest take: ".concat(req.url).concat(" ---> " + duration).concat(" ms").red);
    // console.log(req);
    if ( !viewtype ){
      this.decode(body, req, response);
    } else {
        this.emit(viewtype, body, req, response);
    }
  }
};

Engine.prototype.isProxyConnected = function(){
  return this.proxy !== undefined;
};

Engine.prototype.proxy_connect = function (req, viewtype) {
  var that = this;

  var data = fs.readFileSync(nconf.get("proxies"), 'utf8');
  var lines = data.split('\n');
  var proxy = lines[Math.floor(Math.random() * lines.length)];

  // TODO comment this
  // Used for test timeout only
  // proxy = '91.239.24.182:8085';
  // ssl
  // proxy = '5.135.195.166:3128'
  that.proxy = proxy.trim();
  console.log(`Using proxy ${req.requestID} `.cyan + proxy.yellow.bold);
  return {
    'proxy': `http://${proxy}`,
    'parse_cookies': true,
    'follow_set_cookies': true
  };
};

Engine.prototype.aspireOnStore = function () {

  _.each(this.stores, function(){
    this.request(params);
  });

};


module.exports = Engine;
