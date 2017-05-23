var nconf = require("nconf"),
  request = require('request');
const DEFAULT_TEST_TIMEOUT = nconf.get("tests:timeout") !== undefined ? nconf.get("tests:timeout") : 45000;

var TestTraitement = function (opts, callback_test) {
  this.opts = opts;
  this.errors = null;
  this.server_returns = [];
  this.isFailed = false;
  this.callback_test = callback_test;
  console.log("Test case: ".red, opts);
}

TestTraitement.prototype.next = function(){
  if (this.hasFailed()){
    console.log("Test has failed: ".red);
    this.callback_test(this.getResults());
  } else {
    console.log("Calls next verify test...".yellow);
    this.callback_test();
  }
};

TestTraitement.prototype.hasFailed = function(isFailed){
  return isFailed;
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
    console.log("error: ", this.getResults());
    this.next();
  }
  that.verify(function(){
    console.log("Verifing...".yellow);
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
  console.log("launched".green);
  that.aspire(function(){
    that.checking();
  });
};

TestTraitement.prototype.aspire = function (callback) {
  var that = this;
  // console.log("Calls: " + $url_api.concat('/api/update').yellow );
  var url = $url_api.concat('/api/update');
  request.post(url,
  {
    time : true,
    json: this.opts
  }, function (error, response, body) {
    console.log(`Request time ${url} in ms`.yellow, response.elapsedTime);

    if (!error && response) {
      that.setHasFailed(! (response.statusCode == 200 && (body.status === 'pending' || body.status === 'set' || body.data !== undefined)));
      that.results(body);
    } else {
      that.setHasFailed(true);
      that.results(error);
    }
    callback();
  });
  return;
};

TestTraitement.prototype.verify = function (callback) {
  var that = this;
  // console.log("Calls: " + $url_api.concat('/api/request/' + this.data.requestID ).yellow );
  var url = $url_api.concat('/api/request/' + this.data.requestID);
  request.get( {
    url: url,
    time : true
  }, function (error, response, body){
    console.log(`Request ${url} time in ms`.yellow, response.elapsedTime);
    if (!error && response) {
        var result = JSON.parse(body);
        // console.log(! (response.statusCode == 200 && (result.status === 'pending' || result.status === 'set' || result.data !== undefined)))
        that.setHasFailed(! (response.statusCode == 200 && (result.status === 'pending' || result.status === 'set' || result.data !== undefined)));
        that.results(result);

    } else {
      that.setHasFailed(true);
      that.results(error);
    }

    callback();
  });
  return;
};

module.exports = TestTraitement;
