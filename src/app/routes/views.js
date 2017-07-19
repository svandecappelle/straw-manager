var express = require('express'),
  router = express.Router(),
  buffer = require('./../model/buffer'),
  bodyParser = require('body-parser'),
  moment = require('moment'),
  _ = require("underscore"),
  nconf = require('nconf'),
  logger = require("log4js").getLogger('app/routes/views'),
  middleware = require("../middleware");

const LOG_ALL_VIEWS_ACCESS = false;
router.use(bodyParser.urlencoded({
  extended: true
}));

router.use(bodyParser.json());

function getBufferTableSchema(){
  var columns = [
    'requestID',
    'requestDate',
    'responseDate',
    'time',
    'Enseigne',
    'idProduit',
    'libelles',
    'url',
    'stores',
    'status',
    'aspired_stores',
    'not_found_in_stores'
  ];
  var schema = [];
  for (column of columns) {
    schema.push({data: column, searchable: true});
  }
  return schema;
}

var rootPath = nconf.get('aspiration:rootPath');

// middleware that is specific to this router
if (LOG_ALL_VIEWS_ACCESS){
  router.use(function timeLog (req, res, next) {
    logger.trace(`${req.url} Time: `.yellow, moment().format('L [|] hh:mm:ss').green);
    next();
  });
}

router.use(function timeLog (req, res, next) {
  if (req.session && req.session.passport && req.session.passport.user){
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
  middleware.render(req, res, 'index.pug', {
    bufferLength: buffer.getBuffer().length,
    pending: buffer.pending().length,
    set: buffer.aspired().length,
    failed: buffer.failed().length,
    session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null
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
      "deleted"       :req.params.id,
      "bufferLength"  :buffer.getBuffer().length
    });
  } else {
    logger.warn("".concat(req.params.id).red + " not found");
    res.status(404).send({"Error":"a valid ID must be choosen"})
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
  var bufferValues = buffer.getBuffer();

  middleware.render(req, res, 'buffer.pug', {
    buffer: bufferValues,
    schema: getBufferTableSchema(),
    session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null,
    view: 'buffer'
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

router.get('/request/:id', function (req, res) {
  var elem = buffer.getElementByRequestID({
    "requestID":req.params.id
  });

  middleware.render(req, res, 'request.pug', {
    request: elem ,
    schema: getBufferTableSchema(),
    session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null
  });
});

module.exports = router
