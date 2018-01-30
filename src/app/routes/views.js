const express = require('express');
const router = express.Router();
const buffer = require('./../model/buffer');
const bodyParser = require('body-parser');
const path = require('path');
const moment = require('moment');
const _ = require("underscore");
const nconf = require('nconf');
const logger = require("log4js").getLogger('app/routes/views');
const ora = require('ora');
const middleware = require("../middleware");
const yaml_config = require('node-yaml-config');

const LOG_ALL_VIEWS_ACCESS = false;
router.use(bodyParser.urlencoded({
  extended: true
}));

router.use(bodyParser.json());

function getBufferTableSchema() {
  var columns = [
    'requestID',
    'requestDate',
    'responseDate',
    'time',
    'url',
    'status',
    'aspired_pages'
  ];
  var schema = [];
  for (column of columns) {
    schema.push({ data: column, searchable: true });
  }
  return schema;
}

var rootPath = nconf.get('aspiration:rootPath');

function config_name(name){
  return path.resolve(__dirname, "./../../../config/".concat(name.toLowerCase()).concat(".").concat("yml"));
}

// middleware that is specific to this router
if (LOG_ALL_VIEWS_ACCESS) {
  router.use(function timeLog(req, res, next) {
    logger.trace(`${req.url} Time: `.yellow, moment().format('L [|] hh:mm:ss').green);
    next();
  });
}

router.use(function timeLog(req, res, next) {
  if (req.session && req.session.passport && req.session.passport.user) {
    next();
  } else if (req.url.indexOf("login") === -1) {
    logger.warn(`Not Connected user ${req.url} Time: `.yellow, moment().format('L [|] hh:mm:ss').green);
    req.session.urlfrom = req.url;
    res.redirect('/login');
  } else {
    next();
  }
});

// define the home page route
router.get('/', function (req, res) {
  buffer.getBuffer().then( (bufferList) => {
    middleware.render(req, res, 'index.pug', {
      bufferLength: bufferList.length,
      pending: buffer.pending().length,
      set: buffer.aspired().length,
      failed: buffer.failed().length,
      session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null
    });
  })
  .catch( () => {
    middleware.render(req, res, 'index.pug', {
      bufferLength: 0,
      pending: 0,
      set: 0,
      failed: 0,
      session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null
    });
  });
});

router.get('/purge', function (req, res) {
  if (req.session && req.session.passport && req.session.passport.user) {
    var flyshType = req.query.type;
    buffer.flush(flyshType);
    res.redirect("/");
  } else {
    res.status(401).json({
      status: 401,
      error: 'Not authorized'
    });
  }
});

router.get('/drop/:id', function (req, res) {
  logger.info("".concat(req.params.id).red + " to delete !");
  var elem = buffer.drop(req.params.id);

  if (elem) {
    logger.info("".concat(req.params.id).red + " deleted");
    res.status(200).send({
      "deleted": req.params.id,
      "bufferLength": buffer.getBuffer().length
    });
  } else {
    logger.warn("".concat(req.params.id).red + " not found");
    res.status(404).send({ "Error": "a valid ID must be choosen" })
  }
});

// define the about route
router.get('/about', function (req, res) {
  middleware.render(req, res, 'about.pug', {
    session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null
  });
});

router.get('/buffer', function (req, res) {
  logger.debug('buffer requested !'.red);

  buffer.getBuffer().then( (bufferList) => {
    middleware.render(req, res, 'buffer.pug', {
      buffer: bufferList,
      schema: getBufferTableSchema(),
      session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null,
      view: 'buffer'
    });
  }).catch(() => {
    middleware.render(req, res, 'buffer.pug', {
      buffer: [],
      schema: getBufferTableSchema(),
      session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null,
      view: 'buffer'
    });
  });  
});

router.get('/pending', function (req, res) {
  logger.debug('pending buffer requested !'.red);
  middleware.render(req, res, 'buffer.pug', {
    buffer: buffer.pending(),
    schema: getBufferTableSchema(),
    session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null,
    view: 'pending'
  });
});

router.get('/set', function (req, res) {
  logger.debug('aspired buffer requested !'.red);
  middleware.render(req, res, 'buffer.pug', {
    buffer: buffer.aspired(),
    schema: getBufferTableSchema(),
    session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null,
    view: 'set'
  });
});

router.get('/failed', function (req, res) {
  logger.debug('failed buffer requested !'.red);
  middleware.render(req, res, 'buffer.pug', {
    buffer: buffer.failed(),
    schema: getBufferTableSchema(),
    session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null,
    view: 'failed'
  });
});

router.get('/search', function (req, res) {
  logger.info('search into buffer requested !'.red);
  middleware.render(req, res, 'buffer.pug', {
    buffer: buffer.search(req.query["q"]),
    schema: getBufferTableSchema(),
    session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null,
    view: `search?q=${req.query["q"]}`
  });
});

router.get('/view/:view', function (req, res) {
  logger.info('aspire view requested !'.red);

  let allowedViews = [
    "aspire",
    "site"
  ];

  if (!_.contains(allowedViews, req.params.view)){
    return res.status(403).send("<h1>Not allowed</h1>");
  }

  middleware.render(req, res, req.params.view + '.pug', {
    session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null,
    config: _.extend({
      timeout: nconf.get("aspiration:timeout") * 60 * 1000
    }, yaml_config.load(config_name("sites/global")))
  });
});

var spinner = ora('Aspire informations... [' + buffer.pending_length() + ']\r')

router.post('/view/:view', function (req, res) {
  logger.info(req.params.view + ' view requested !'.red);
  let allowedViews = [
    "aspire",
    "site"
  ];

  if (!_.contains(allowedViews, req.params.view)){
    return res.status(403).send("Not allowed");
  }

  // res.redirect(307, "../api/update");
  var tempo = req.body
  logger.info('server received :'.red, tempo);
  if (buffer.validQuery(tempo)) {
    logger.info("querying aspiration...");
    //spinner.start();
    spinner.text = 'Aspire informations... [' + buffer.pending_length() + ']\r';

    if (nconf.get("aspiration:interactive")) {
      // Mode interactive activated: The result is returned into POST return call.
      var elem = buffer.add(req.body, function (results) {
        console.log("pending buffer: ".concat(buffer.pending_length()).green.bold);
        if (buffer.pending_length() === 0) {
          spinner.stop();
        } else {
          spinner.text = 'Aspire informations... [' + buffer.pending_length() + ']\r';
        }
        logger.info("results sent");
        res.status(200).send(results);
      });
    } else {
      // Mode interactive activated: The result is not returned into POST return call.
      // User need to call buffer to now the status.

      var elem = buffer.add(req.body, function (results) {

        console.log("pending buffer: ".concat(buffer.pending_length()).green.bold);
        if (buffer.pending_length() === 0) {
          spinner.stop();
        } else {
          spinner.text = 'Aspire informations... [' + buffer.pending_length() + ']\r';
        }
        logger.info("results are now accessibles");
      });

      res.status(200).redirect("..");
    }
  }
});

router.get('/request/:id', function (req, res) {
  buffer.getElementByRequestID({
    "requestID": req.params.id,
    start: 0
  }).then( (result) => {
    middleware.render(req, res, 'request.pug', {
      request: result,
      schema: getBufferTableSchema(),
      session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null
    });
  }).catch( (error) => {
    logger.error(error);
    middleware.render(req, res, 'request.pug', {
      request: undefined,
      schema: getBufferTableSchema(),
      session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null
    });
  });
});

module.exports = router
