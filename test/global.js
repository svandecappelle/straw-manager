var chai = require('chai'),
    _ = require('underscore'),
    request = require('request'),
    colors = require('colors'),
    nconf = require("nconf"),
    async = require("async"),
    TestTraitement = require("./traitements_model");
var expect = chai.expect; // we are using the "expect" style of Chai
var $test_port = 15555;
$url_api = 'http://localhost:' + $test_port;

process.title = "Testing CollectOnline API";

var $case_tests = require("./cases/defaults.json");
var apiServer = require("./../src/server");

nconf.argv()
   .env()
   .file({ file: './config.json' });

const AUTORUN_SERVER = nconf.get("tests:autorun_server") !== undefined ? nconf.get("tests:autorun_server") : false;
const SILENT_MODE = nconf.get("tests:silent") !== undefined ? nconf.get("tests:silent") : true;
const PARALLEL_CALLS = 6;

if (AUTORUN_SERVER) {
  console.log("Using auto run server".yellow.italic);
  apiServer.run({

    port: $test_port,
    silent: SILENT_MODE,
    run_server: AUTORUN_SERVER

  },function tests(){
    run();
  });
} else {
  var nconf = require("nconf");
  nconf.argv()
     .env()
     .file({ file: './config.json' });

  $test_port = nconf.get("tests:port");
  $url_api = 'http://' + nconf.get("tests:hostname") + ':' + $test_port + nconf.get("tests:service_location");
  run();
}

function run () {
  var index = 0;
  console.log($case_tests.valids);
  describe('POSTs tests:', function() {
    it('Post should returns in non interactive mode a request pending object', function(done) {
      this.timeout(1200000);

      async.eachLimit($case_tests.valids, PARALLEL_CALLS, function(value, next){
        value.index = index;
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
    request.get( $url_api.concat('/api/request/' + 15484155), function (error, response, body){
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
