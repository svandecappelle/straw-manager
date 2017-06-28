#!/usr/bin/env node

var chai = require('chai'),
    _ = require('underscore'),
    request = require('request'),
    path = require('path'),
    colors = require('colors'),
    argv = require("argv"),
    yaml_config = require('node-yaml-config'),
    fs = require('fs'),
    log4js = require('log4js'),
    logger = log4js.getLogger('BatchEntryPoint'),
    async = require("async"),
    ora = require("ora"),
    spinner = ora('Running batch process...\r'),
    TestTraitement = require("../src/batch/traitements_model");
var expect = chai.expect; // we are using the "expect" style of Chai
var $test_port = 15555;
var $url_api = 'http://localhost:' + $test_port;

logger.setLevel("INFO");

String.prototype.replaceAll = function(find, replace) {
	return this.replace(new RegExp(find, 'g'), replace);
};

require('request-persistent')(request);
var jar = request.jar();

process.title = "Testing CollectOnline API";


function config_file(name){
  return path.resolve(__dirname, "./".concat(name)).concat(".").concat("yml");
}

argv.version("1.0");
argv.option({
   name: 'file',
   short: 'f',
   type: 'path',
   description: 'batch file JSON formatted'
});
var args = argv.run();
const configuration = yaml_config.load(config_file("config"));
log4js.configure(configuration.logger);

var input_file = path.resolve(__dirname, './'.concat(configuration["input-file"]));
if (args.options.file){
  input_file = args.options.file;
}

if (!fs.existsSync(input_file)){
  logger.error(`Error batch file not exists: ${input_file}`.bold.red);
  process.exit(1);
}

const $case_tests = require(input_file);

logger.info("Batch environment".yellow, configuration.server);

const AUTORUN_SERVER = configuration.server.autorun_server !== undefined ? configuration.server.autorun_server : false;
const SILENT_MODE = configuration.server.silent !== undefined ? configuration.server.silent : true;
const PARALLEL_CALLS = configuration.batch.parallel !== undefined ? configuration.batch.parallel : 6;

if (AUTORUN_SERVER) {
  var apiServer = require("./../src/server");
  logger.info("Using auto run server".yellow.italic);
  apiServer.run({

    port: $test_port,
    silent: SILENT_MODE,
    run_server: AUTORUN_SERVER

  },function tests(){
    connect();
  });
} else {
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
    }, (error, response, body) => {
      if (!error && response) {
        logger.info("Connected to CollectOnline server".green);
        run();
      } else {
        logger.error(error);
        logger.error("Cannot connect to CollectOnline server".red);
        process.exit(1);
      }
    });
  } else {
    run();
  }

}

function callProcessing(type){
  var type = type + '-processing';

  const spawn = require('child_process').spawn;
  const cwd = spawn(configuration.batchs[type].cwd, _.pluck(configuration.batchs[type].arguements, 'value'));

  cwd.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  cwd.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
  });

  cwd.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
  });

}

function run () {
  var index = 0;
  callProcessing('pre');
  spinner.start();

  async.eachLimit($case_tests.valids, PARALLEL_CALLS, (value, next) => {
    value.index = index;
    value.jar = jar;
    value.url_api = $url_api;
    value['checking-interval'] = configuration.batchs['checking-interval'];
    value['max-checking'] = configuration.batchs['max-checking'];

    index += 1;
    logger.debug(`Call aspiration on ${value.url}`);
    var traitment = new TestTraitement(value, next);
    traitment.launch();

  }, (err, values) => {

    spinner.stop();
    logger.info("Done all parrallel calls".green);

    if (!err){
      callProcessing('post');
    }
  });
}
