var events = require('events'),
  // request = require('request'),
  needle = require('needle'),
  _ = require('underscore'),
  path = require('path'),
  nconf = require('nconf'),
  merge = require('merge-object'),
  fs = require('fs'),
  yaml_config = require('node-yaml-config');

function config_name(name){
  return path.resolve(__dirname, "./../../../config/".concat(name).concat(".").concat("yml"));
}

function Engine () {
  events.EventEmitter.call(this);
  this.config = yaml_config.load(config_name("sites/global"));

  this.cookies = {};
  this.aspiredDatas = 0;
  if (this.name){
    this.logger = require('log4js').getLogger(this.name);
    this.logger.setLevel(nconf.get("logLevel"));
    var config_path = config_name("sites/" + this.name);
    if (fs.existsSync(config_path)){
      this.config = _.extend(this.config, yaml_config.load(config_path));
    } else {
      this.logger.warn(`Configuration file ${config_path} not existing skipping loading`);
    }
    this.logger.debug("Configuration: ", this.config);
  } else {
    this.logger = require('log4js').getLogger('Engine');
  }
  if (this.config && this.config.use_proxy !== undefined){
    this.use_proxy = this.config.use_proxy;
    if (!this.use_proxy){
      this.logger.warn("Proxy connection is desactivated on this engine launch see configuration file");
    }
  }

  this.on('cookies', this.parse_cookies);

  this.on('product', this.export);
  this.on('not_found', this.export);

};

Engine.prototype.__proto__ = events.EventEmitter.prototype;

Engine.prototype.export = function (output) {
  this.aspiredDatas += 1;
  this.logger.debug(this.stores.length, " / ", this.aspiredDatas);
  if (this.stores.length <= this.aspiredDatas){
    this.logger.info(`Done all datas aspiration ${output.requestID}`.green);
    this.emit('done', output);
  }

};

Engine.prototype.parse_cookies = function (req, cookies) {
  this.logger.debug("Getting cookies: ", req.url, cookies);
};

Engine.prototype.request = function (req, viewtype, callback) {
  if (typeof viewtype === 'function'){
    callback = viewtype;
    viewtype = undefined;
  }
  try {
    var that = this;
    // console.log(that);
    this.logger.debug("Using proxy check: ", req.url, this.use_proxy);
    var options = {
      timeout: 50000,
      read_timeout: 60000,
      open_timeout: 60000,
      follow_max: 10
    };
    if (this.use_proxy && !this.isProxyConnected()){
      options = this.proxy_connect(req, viewtype);
    }

    if (req.cookies){
      options.cookies = merge(that.cookies, req.cookies);
    }

    this.logger.trace("using opts : ", options);
    var needle_call = needle.get;
    if (req.opts && req.opts.method === 'POST'){
        needle_call = needle.post;
    }

    var http_response_cb = function(error, response, body){
      if (response){
        if (response.cookies){
          var cookies = response.cookies;
          that.emit("cookies", req, cookies);
          that.cookies = merge(that.cookies, cookies);
          that.logger.debug(req.url, cookies, that.cookies, req.cookies);
        }
      }
      if (that.config.wait){
        that.logger.debug(`Waiting before parsing querie (see configurations): ${that.config.wait}`);
        setTimeout(function(){
          that.onResult(error, response, body, viewtype, req);
          if (callback){
            callback();
          }
        }, that.config.wait);
      } else {
        that.onResult(error, response, body, viewtype, req);
        if (callback){
          callback();
        }
      }
    };

    if (req.opts) {
      options = _.extend(options, req.opts);
    }

    this.logger.trace("needle_call: ", options, req);

    var call;
    if (options.method === 'POST'){
      call = needle_call(req.url,  _.omit(options, 'data'), http_response_cb);
    } else {
      call = needle_call(req.url, options, http_response_cb);
    }

    call.on('error', function(err){
      that.logger.error("Error on calling request engine", err);
      if (req.current_try >= that.config.maxtry){
        if (callback){
          if (that.config.wait){
            that.logger.info(`Waiting before parsing querie (see configurations): ${that.config.wait}`);
            that.emit("fatal_error", { message: 'connecting maxtry', origin: err}, req);
            setTimeout(callback, that.config.wait);
          } else {
            that.emit("fatal_error", { message: 'connecting maxtry', origin: err}, req);
            callback();
          }
        }
      }
    }).on('redirect', function(url) {
      that.logger.debug(`redirect url: ${url.red}`);
    });

    this.logger.trace("needle_called: ", needle_call);
  } catch (error) {
    console.error(error);
    this.emit("fatal_error", {'message': 'Engine cannot be called successfully', origin_error: error, stack: error.stack}, req);
    if (callback){
      if (that.config.wait){
        that.logger.info(`Waiting before parsing querie (see configurations): ${that.config.wait}`);
        setTimeout(callback, that.config.wait);
      } else {
        callback();
      }
    }
  }
};

Engine.prototype.onResult = function (error, response, body, viewtype, req) {
  if (error){
    if ( !req.current_try ){
      req.current_try = 1;
    }
    req.current_try += 1;
    this.logger.info(`\r\nRetry ${req.current_try} / ${this.config.maxtry}`);
    if (error.code === 'ETIMEDOUT'){

      if (req.current_try > this.config.maxtry){
        this.logger.info(`Maximum number of tries [${req.current_try} / ${this.config.maxtry}]. Request marked as failed`, _.omit(req, ["stores", "aspired_stores"]));
        this.emit("fatal_error", {message: `maximum number of connection try: ${this.config.maxtry}`, origin_error: error}, req);
      } else {
        this.logger.info(`Connection to proxy ${this.proxy} timed out trying another one.`);
        this.proxy = undefined;
        return this.request(req, viewtype);
      }

    } else {
      if (req.current_try > this.config.maxtry){
        this.logger.info(`Maximum number of tries [${req.current_try}]. Request marked as failed`, _.omit(req, ["stores", "aspired_stores"]));
        this.emit("fatal_error", {message: `maximum number of connection try: ${this.config.maxtry}`, origin_error: error}, req);
      } else {
        this.logger.info(`Connection to proxy ${this.proxy} timed out trying another one.`);
        this.proxy = undefined;
        this.request(req, viewtype);
      }

    }
  } else {
    req.current_try = 1;
    var duration = Date.now() - req.requestDate;
    req.duration = duration;
    this.logger.debug("\rRequest take: ".concat(req.url).concat(" ---> " + duration).concat(" ms").red);
    // console.log(req);
    if ( !viewtype ){
      try {
        this.decode(body, req, response);
      } catch(error){
        this.emit("fatal_error", {error: error, requestID: req.requestID}, req)
      }

    } else {
        this.emit(viewtype, body, req, response);
    }
  }
};

Engine.prototype.isProxyConnected = function(){
  return this.proxy !== undefined;
};

Engine.prototype.proxy_connect = function (req, viewtype) {
  var proxyFile = nconf.get("proxies");
  if (!proxyFile){
      this.logger.warn("Proxu files not defined use the default.");
      proxyFile = "../proxyRU.txt";
  }
  proxyFile = path.resolve(__dirname, "../../../config/" + proxyFile);
  var data = fs.readFileSync(proxyFile, 'utf8');
  var lines = data.split('\n');
  var proxy = lines[Math.floor(Math.random() * lines.length)];

  // TODO comment this
  // Used for test timeout only
  // proxy = '91.239.24.182:8085';
  // ssl
  // proxy = '5.135.195.166:3128'
  this.proxy = proxy.trim();
  // this.proxy = 'http://91.242.217.148:8085'
  this.logger.info(`Using proxy `.cyan + proxy.yellow.bold);
  return {
    'proxy': `http://${this.proxy}`,
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
