var chai = require('chai'),
    _ = require('underscore'),
    request = require('request'),
    path = require('path'),
    colors = require('colors'),
    nconf = require("nconf"),
    yaml_config = require('node-yaml-config'),
    fs = require('fs'),
    async = require("async"),
    TestTraitement = require("../src/batch/traitements_model");
var expect = chai.expect; // we are using the "expect" style of Chai
var $test_port = 15555;
var $url_api = 'http://localhost:' + $test_port;

String.prototype.replaceAll = function(find, replace) {
	return this.replace(new RegExp(find, 'g'), replace);
};

require('request-persistent')(request);
var jar = request.jar();

process.title = "Testing CollectOnline API";


function config_file(name){
  return path.resolve(__dirname, "./".concat(name)).concat(".").concat("yml");
}

nconf.argv()
   .env()
   .file({ file: path.resolve(__dirname,'../config.json')});
const configuration = yaml_config.load(config_file("config"));

if (!fs.existsSync(path.resolve(__dirname, './'.concat(configuration["input-file"])))){
  console.log(`Error batch file not exists: ${configuration["input-file"]}`.bold.red);
  process.exit(1);
}
const $case_tests = require(path.resolve(__dirname, './'.concat(configuration["input-file"])));

console.log("Batch environment".yellow, configuration.server);

const AUTORUN_SERVER = configuration.server.autorun_server !== undefined ? configuration.server.autorun_server : false;
const SILENT_MODE = configuration.server.silent !== undefined ? configuration.server.silent : true;
const PARALLEL_CALLS = 6;

if (AUTORUN_SERVER) {
  var apiServer = require("./../src/server");
  console.log("Using auto run server".yellow.italic);
  apiServer.run({

    port: $test_port,
    silent: SILENT_MODE,
    run_server: AUTORUN_SERVER

  },function tests(){
    connect();
  });
} else {
  var nconf = require("nconf");
  nconf.argv()
     .env()
     .file({ file: './config.json' });

  $test_port = configuration.server.port;
  $url_api = 'http://' + configuration.server.hostname + ':' + $test_port + configuration.server.service_location;
  connect();
}

function parseCookies (request) {
    var list = {},
        rc = request.headers.cookie;

    rc && rc.split(';').forEach(function( cookie ) {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });

    return list;
}

function connect(){
  if (configuration.server.use_auth) {
    request.post( {
      url: `http://${configuration.server.hostname}:${$test_port}/login`,
      jar: jar,
      body: {
        username: configuration.server.credentials.user,
        password: configuration.server.credentials.password
      },
      json: true
    }, function (error, response, body){
      if (!error && response) {
        console.log("Connected to CollectOnline server".green);
        run();
      } else {
        console.error(error);
        console.log("Cannot connect to CollectOnline server".red);
        process.exit(1);
      }
    });
  } else {
    run();
  }

}

function run () {
  var index = 0;
  async.eachLimit($case_tests.valids, PARALLEL_CALLS, function(value, next){
    value.index = index;
    value.jar = jar;
    value.url_api = $url_api;
    index += 1;
    console.log(`Call aspiration on ${value.url}`);
    var traitment = new TestTraitement(value, next);
    traitment.launch();

  }, function (err, values) {
    console.log("Done all parrallel calls".green);
  });
}
