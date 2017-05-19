var chai = require('chai'),
    request = require('request'),
    _ = require('underscore'),
    colors = require('colors'),
    nconf = require("nconf"),
    async = require("async");
var expect = chai.expect; // we are using the "expect" style of Chai
var $test_port = 15555;
var $url_api = 'http://localhost:' + $test_port;

process.title = "Testing CollectOnline API";

var $case_tests = require("./cases/defaults.json");
var apiServer = require("./../src/server");

nconf.argv()
   .env()
   .file({ file: './config.json' });

const AUTORUN_SERVER = nconf.get("tests:autorun_server") !== undefined ? nconf.get("tests:autorun_server") : false;
const DEFAULT_TEST_TIMEOUT = nconf.get("tests:timeout") !== undefined ? nconf.get("tests:timeout") : 45000;
const SILENT_MODE = nconf.get("tests:silent") !== undefined ? nconf.get("tests:silent") : true;

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

  $test_port = nconf.get("port");
  $url_api = 'http://localhost:' + $test_port;
  run();
}


function convertToProcessingCall (value){
  var output = function(){

    console.log("Test case: ".red, value);

    describe('POSTs tests for: ' + value.index + " -- " + value.Enseigne, function() {
      it('Post should return in non interactive mode a request pending object [' + value.index + " -- " + value.Enseigne + ']', function(done) {
        this.timeout(DEFAULT_TEST_TIMEOUT);
        var opts = value;
        console.log("Calls: " + $url_api.concat('/api/update').yellow );
        request.post( $url_api.concat('/api/update'), { json : opts }, function (error, response, body) {
            if (!error && response) {
                if (response.statusCode == 200){
                    done(body.status === 'pending' || body.status === 'set' || body.data !== undefined ? undefined : body);
                } else {
                    done(body);
                }
            } else {
                done(error);
            }
        });
      });

      it('Get method should return results of aspiration [' + value.index + " -- " + value.Enseigne + ']', function (done){
        console.log("Calls: " + $url_api.concat('/api/request/' + value.index).yellow );
        this.timeout(DEFAULT_TEST_TIMEOUT);
        request.get( $url_api.concat('/api/request/' + value.index), function (error, response, body){
          if (!error && response) {
              if (response.statusCode == 200){
                  var result = JSON.parse(body);
                  done(result.status === 'pending' || result.status === 'set' ? undefined : body);
              } else {
                  done(body);
              }
          } else {
              done(error);
          }
        });
      });
    });
  };
  return output;
}


function run () {
  var index = 0;

  var processing_calls = _.map($case_tests.valids, function(value){
    value.index = index;
    index += 1;
    return convertToProcessingCall(value);
  });

  async.parallelLimit(processing_calls, 5, function(){
    logger.info("Done");
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
