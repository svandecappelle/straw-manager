
/*jslint node: true */
var _ = require('underscore'),
  path = require('path');

engine = require("./engine/engine");

(function (Engine) {
    "use strict";

    Engine.start = function (opts, callback) {
      var enseigne_lancher = require("./sites/" + opts.Enseigne);

      //engine.config.auto_exit = false;
      // enseigne_lancher.engine = engine;
      var params = _.extend({
        idProduit : '',
        Enseigne : '',
        url : '',
        MagasinId : '',
        requestID : null
      }, opts);

      var callback_update = function(results){
        callback(results);
      };

      enseigne_lancher.update(params, callback_update);

    };

}(exports));
