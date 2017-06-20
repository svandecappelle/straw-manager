var chai = require('chai'),
    _ = require('underscore'),
    request = require('request'),
    colors = require('colors'),
    nconf = require("nconf"),
    async = require("async"),
    TestTraitement = require("../src/batch/traitements_model");
var expect = chai.expect; // we are using the "expect" style of Chai
var $test_port = 15555;
$url_api = 'http://localhost:' + $test_port;

require('request-persistent')(request);
var jar = request.jar();

process.title = "Testing CollectOnline API";

var $case_tests = require("./cases/defaults.json");
var apiServer = require("./../src/server");

nconf.argv()
   .env()
   .file({ file: './config.json' });

const environmentParameters = nconf.get("tests:environments")[nconf.get("tests:default")];

console.log("Test environment".yellow, environmentParameters);

const AUTORUN_SERVER = environmentParameters.autorun_server !== undefined ? environmentParameters.autorun_server : false;
const SILENT_MODE = environmentParameters.silent !== undefined ? environmentParameters.silent : true;
const PARALLEL_CALLS = 6;

if (AUTORUN_SERVER) {
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

  $test_port = environmentParameters.port
  $url_api = 'http://' + environmentParameters.hostname + ':' + $test_port + environmentParameters.service_location;
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
  if (environmentParameters.use_auth) {
    describe('Connection test:', function() {
      it('Connection to CollectOnline should work', function(done) {
        request.post( {
          url: `http://${environmentParameters.hostname}:${$test_port}/login`,
          jar: jar,
          body: {
            username: 'Brico1',
            password: 'Brico1'
          },
          json: true
        }, function (error, response, body){
          if (!error && response) {
            console.log("Connected".green);
            run();
            done();
          } else {
            process.exit(1);
          }
        });
      });
    });
  } else {
    run();
  }

}

function run () {
  var index = 0;

  describe('POSTs tests:', function() {
    it('Post should returns in non interactive mode a request pending object', function(done) {
      this.timeout(1200000);

      async.eachLimit($case_tests.valids, PARALLEL_CALLS, function(value, next){
        value.index = index;
        value.jar = jar;
        index += 1;

        var traitment = new TestTraitement(value, next);
        traitment.launch();

      }, function (err, values) {
        console.log("Done all parrallel calls".green);
        done(err);
      });

    });
  });

  it('Invalid query id should return no results', function(done){
    request.get( {
      url:$url_api.concat('/api/request/' + 15484155),
      jar: jar,
    }, function (error, response, body){
      if (!error && response) {
          if (response.statusCode == 404){
            done();
          }
      } else {
          done(error);
      }
    });
  });
}
