var chai = require('chai'),
    request = require('request'),
    _ = require('underscore'),
    colors = require('colors');
var expect = chai.expect; // we are using the "expect" style of Chai
var $test_port = 15555;
var $url_api = 'http://localhost:' + $test_port;

process.title = "Testing CollectOnline API";

var $case_tests = require("./cases/defaults.json");
var apiServer = require("./../src/server");

const autorun_server = false;
if (autorun_server) {
  apiServer.run({

    port: $test_port,
    silent: true,
    run_server: true

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
function run () {
  var index = 0;
  _.each($case_tests.valids, function(value){

    value.index = index;
    index += 1;
    console.log("Test case: ".red, value, index);

    describe('POSTs tests', function() {
      it('Post should return in non interactive mode a request pending object', function(done) {

        var opts = value;
        console.log("Calls: " + $url_api.concat('/api/update').yellow );
        request.post( $url_api.concat('/api/update'), { json : opts }, function (error, response, body) {
            if (!error && response) {
                if (response.statusCode == 200){
                    done(body.status === 'pending' || body.status === 'set' ? undefined : body);
                } else {
                    done(body);
                }
            } else {
                done(error);
            }
        });
      });

      it('Get method should return results of aspiration', function (done){
        console.log("Calls: " + $url_api.concat('/api/request/' + value.index).yellow );
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
