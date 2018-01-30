
/*jslint node: true */
var _ = require('underscore'),
  async = require('async'),
  nconf = require('nconf'),
  path = require('path');
const { URL } = require('url');

engine = require("./engine/engine");

var site_engines = {};

class Engine {
  constructor(){

  }
  start (opts, eventEmitter) {
    try {
      console.log(nconf.get("aspiration:timeout"));
      var timeout_aspiration = nconf.get("aspiration:timeout") * 60 * 1000;
      if (!opts.Enseigne) {
        opts.Enseigne = 'Generic';
        let startPage = new URL(opts.url);
        opts.Enseigne = startPage.hostname;
        var Initialiser = require("./sites/generic");
      } else {
        var Initialiser = require("./sites/" + opts.Enseigne.toLowerCase());
      }

      if (opts.timeout) {
        timeout_aspiration = opts.timeout;
      }

      this.enseigne_lancher = new Initialiser(opts.url.indexOf("https://") === -1, opts.Enseigne);

      this.enseigne_lancher.on('done', (data) => {
        eventEmitter.emit('done', data);
      });

      this.enseigne_lancher.on('product', (data) => {
        eventEmitter.emit('product', data);
      });

      this.enseigne_lancher.on('not_found', (data) => {
        eventEmitter.emit('not_found', data);
      });

      this.enseigne_lancher.on('fatal_error', (error, req) => {
        eventEmitter.emit('error', error, req);
      });

      var request = _.extend({
        site : '',
        url : ''
      }, _.pick(opts, ['site', 'url', 'requestID', 'requestDate', 'responseDate', 'status', "callback", "data", "Enseigne", "aspired_pages"]));
      request.parameters = _.omit(opts, ['site', 'url', 'requestID', 'requestDate', 'responseDate', 'status', "callback", "data", "Enseigne", "aspired_pages"]);

      // todo
      if (timeout_aspiration >= 1){
        var call_process = async.timeout( (callback) => {
          this.enseigne_lancher.call(request);
  
          this.enseigne_lancher.on('done', (data) => {
            callback();
          });
  
          this.enseigne_lancher.on('fatal_error', (data) => {
            callback();
          });
        }, timeout_aspiration);

        call_process(err => {
          if (err && err.message === 'Callback function "aspiration" timed out.') {
            eventEmitter.emit('timeout', {err: `Aspiration take to much time on one product > ${timeout_aspiration / 1000}sec: ${err.code}`}, params);
          } else {
            console.log(err);
          }
        });

      } else {
        this.enseigne_lancher.call(request);
      }

    } catch(error) {
      eventEmitter.emit('error', {error: error}, opts);
    }
    return this;
  };

  stop () {
    if (this.enseigne_lancher) {
      this.enseigne_lancher.emit('stop');
    }
  }

}

module.exports = new Engine();