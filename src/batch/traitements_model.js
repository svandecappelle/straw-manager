var nconf = require("nconf"),
  logger = require('log4js').getLogger('Batch'),
  request = require('request');
const DEFAULT_TEST_TIMEOUT = nconf.get("tests:timeout") !== undefined ? nconf.get("tests:timeout") : 45000;


var TestTraitement = function (opts, callback_test) {
  this.maxtry = opts['max-checking'] ? opts['max-checking'] :10;
  this.current_try = 1;
  this.time_recheck = opts['checking-interval'] ? opts['checking-interval'] : 2000;
  this.opts = opts;
  this.errors = null;
  this.server_returns = [];
  this.isFailed = false;
  this.callback_test = callback_test;
  this.jar = opts.jar;
  if (opts.url_api){
    this.url_api = opts.url_api;
  } else {
    this.url_api = $url_api;
  }

  this.opts.jar = undefined;

  logger.info("Test case: ".red, opts);
}

TestTraitement.prototype.next = function(){

  if (this.hasFailed()){
    logger.error("Test has failed: ".red);
    this.callback_test(this.getResults());
  } else {
    logger.info(`Aspiration successfully return some datas ${this.getResults().requestID}`.green);
    this.callback_test();
  }
};

TestTraitement.prototype.hasFailed = function(isFailed){
  return this.isFailed;
};

TestTraitement.prototype.setHasFailed = function(isFailed){
  this.isFailed = isFailed;
};

TestTraitement.prototype.results = function (data) {
  this.data = data;
};

TestTraitement.prototype.getResults = function (data) {
  return this.data;
};

TestTraitement.prototype.checking = function(){
  var that = this;
  if (this.hasFailed()){
    logger.error("error: ", this.getResults());
    this.next();
  }
  that.verify(function(){
    logger.info("Verifing...".yellow);

    that.next();
  });
}

TestTraitement.prototype.add_server_returns = function(obj){
  return this.server_returns.push(obj);
}

TestTraitement.prototype.last_server_returns = function(){
  return this.server_returns[this.server_returns.length - 1];
}

TestTraitement.prototype.launch = function(next){
  var that = this;
  logger.info("launched".green);

  that.aspire(function(){
    that.checking();
  });
};

TestTraitement.prototype.aspire = function (callback) {
  var that = this;
  // console.log("Calls: " + $url_api.concat('/api/update').yellow );
  var url = this.url_api.concat('/api/update');
  request.post(url,
  {
    time : true,
    json: this.opts,
    jar: this.jar
  }, function (error, response, body) {

    if (!error && response) {
      // console.log(`Request time ${url} in ms`.yellow, response.elapsedTime);
      logger.debug(`Request time ${url} in ms`.yellow, response.elapsedTime);
      that.setHasFailed(! (response.statusCode == 200 && (body.status.indexOf('pending') !== -1 || body.status.indexOf('partial') !== -1 || body.status === 'set' || body.data !== undefined)));
      that.results(body);
    } else {
      if (error.code === 'ETIMEDOUT'){
        logger.warn("Connection take too much time ETIMEDOUT".red.underline);
        logger.warn("Testing using checking".cyan);
        callback()
      } else {
        that.setHasFailed(true);
        that.results(error);
      }
    }
    callback();
  });
  return;
};

TestTraitement.prototype.verify = function (callback) {
  var that = this;
  // console.log("Calls: " + $url_api.concat('/api/request/' + this.data.requestID ).yellow );
  var url = this.url_api.concat('/api/request/' + this.data.requestID);

  request.get( {
    url: url,
    time : true,
    jar: this.jar
  }, function (error, response, body){
    if (!error && response) {
      logger.debug(`Request ${url} time in ms`.yellow, response.elapsedTime);
      var result = JSON.parse(body);
      that.setHasFailed(! (response.statusCode == 200 && (result.status.indexOf('pending') !== -1 || result.status.indexOf('partial') !== -1 || result.status === 'set' || result.data !== undefined)));

      if (result.status.indexOf('pending') !== -1){
        that.current_try += 1;
        if (that.current_try >= that.maxtry){
          that.setHasFailed(true);
          that.results(new Error(`Aspiration ${that.getResults().requestID} take too much time ${that.maxtry * that.time_recheck}`));
          return callback();
        } else {
          logger.debug(`Aspiration ${that.getResults().requestID} not yet finished check after ${that.current_try * that.time_recheck}ms`);
          setTimeout(function(){
              that.verify(callback);
          }, that.time_recheck);
          return
        }
      }
      that.results(result);
    } else {
      logger.error(`Request ${url} time in ms`.yellow, error);
      if (error.code === 'ETIMEDOUT'){
        logger.warn("Connection take too much time ETIMEDOUT".red.underline);
        logger.warn(`${(that.current_try + 1).toString().cyan} + "° / ${that.maxtry} try`);

        that.current_try += 1;
        if (that.current_try >= that.maxtry){
          that.setHasFailed(true);
          that.results(error);
        } else {
          return that.verify(callback);
        }
      } else {
        that.setHasFailed(true);
        that.results(error);
      }
    }

    callback();
  });
};

module.exports = TestTraitement;
