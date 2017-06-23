
/*jslint node: true */
var _ = require('underscore'),
  async = require('async'),
  path = require('path');

engine = require("./engine/engine");

var site_engines = {};

const timeout_aspiration = 3600 * 1000;

(function (Engine) {
    "use strict";

    Engine.start = function (opts, eventEmitter) {
      try {
        var Initialiser = require("./sites/" + opts.Enseigne.toLowerCase());

        var enseigne_lancher = new Initialiser(opts.url.indexOf("https://") === -1);

        enseigne_lancher.on('done', function(data){
          eventEmitter.emit('done', data);
        });

        enseigne_lancher.on('product', function(data){
          eventEmitter.emit('product', data);
        });

        enseigne_lancher.on('not_found', function(data){
          eventEmitter.emit('not_found', data);
        });

        enseigne_lancher.on('fatal_error', function(error, req){
          eventEmitter.emit('error', error, req);
        });

        var params = _.extend({
          idProduit : '',
          Enseigne : '',
          url : '',
          MagasinId : '',
          requestID : null
        }, opts);

        // todo
        /*var call_process = async.timeout(function aspiration(callback) {*/
          enseigne_lancher.call(params);
/*
          enseigne_lancher.on('done', function(data){
            callback();
          });
        }, timeout_aspiration);

        call_process(err => {
          if (err.message === 'Callback function "aspiration" timed out.') {
            eventEmitter.emit('error', {err: `Aspiration take to much time on one product > ${timeout_aspiration / 1000}sec: ${err.code}`}, params);
          }
        });
*/
      } catch(error) {
        eventEmitter.emit('error', {error: error}, opts);
      }
    };

}(exports));
