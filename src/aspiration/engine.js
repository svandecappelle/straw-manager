
/*jslint node: true */
var _ = require('underscore'),
  path = require('path');

engine = require("./engine/engine");

var site_engines = {};

(function (Engine) {
    "use strict";

    Engine.start = function (opts, eventEmitter) {

      var Initialiser = require("./sites/" + opts.Enseigne.toLowerCase());
      var enseigne_lancher = new Initialiser(true);
      enseigne_lancher.on('done', function(data){
        eventEmitter.emit('done', data);
      });

      enseigne_lancher.on('fatal_error', function(data){
        eventEmitter.emit('error', data);
      });

      var params = _.extend({
        idProduit : '',
        Enseigne : '',
        url : '',
        MagasinId : '',
        requestID : null
      }, opts);

      enseigne_lancher.call(params);

    };

}(exports));
