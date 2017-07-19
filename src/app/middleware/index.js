
(function (Middleware) {
    "use strict";
    var merge = require('merge-object'),
      nconf = require('nconf');

    Middleware.render = function (req, res, view, obj){
      var rootPath = nconf.get("aspiration:rootPath");
      if (rootPath === undefined){
        rootPath = '';
      }
      res.render(view, merge(obj, {
        rootPath: rootPath + '/',
        refresh_time: 500
      }));
    };

})(exports);
