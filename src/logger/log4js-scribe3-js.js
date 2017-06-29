/* global require, console, exports */
(function() {
    "use strict";
    var layouts = require('log4js/lib/layouts.js'),
        passThrough = layouts.colouredLayout,
        Scribe = require('scribe-js');
        //console = process.console;

    const options = {
      "app": 'simple-server',
      "id": process.pid,
      "module": {
        "writer/SocketIO": {
          "port": 50000,
          "options": {}
        },
        "router/Viewer/client": {
          "background": "#131B21",
          "socketPorts": [
            50000
          ]
        }
      },
      "debug": true
    };

    const console = Scribe.create(options);
    function uncolorize(msg){
      return msg.replace(new RegExp("\\[([0-9]){2}m", 'g'), "");
    }

    /**
     * Scribe Appender for log4js. Sends logging events via Scribe using node-scribe.
     *
     * @param layout function that takes a log event and returns a string
     */
    function scribeAppender(layout) {
        if(!layout) {
            layout = passThrough;
        }

        return function(loggingEvent) {
          var msg = layout(loggingEvent);
          // msg = uncolorize(msg);
          if (loggingEvent.level.levelStr === 'TRACE'){
            console.trace(msg);
          } else if (loggingEvent.level.levelStr === 'INFO'){
            console.info(msg);
          } else if (loggingEvent.level.levelStr === 'WARN'){
            console.warn(msg);
          } else if (loggingEvent.level.levelStr === 'ERROR'){
            console.error(msg);
          } else {
            console.log(msg);
          }
        };
    }

    function makeLayout(config) {
        if (config.layout) {
            return layouts.layout(config.layout.type, config.layout);
        }
        return null;
    }

    function configure(config, layout) {
      var layout = makeLayout(config);
      return scribeAppender(layout, config.timezoneOffset);
    }

    exports.name      = 'scribe';
    exports.appender  = scribeAppender;
    exports.configure = configure;
}());
