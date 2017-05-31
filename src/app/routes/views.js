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

var rootPath = nconf.get('CollectOnlineRootPath');

// middleware that is specific to this router
if (LOG_ALL_VIEWS_ACCESS){
  router.use(function timeLog (req, res, next) {
    logger.info(`${req.url} Time: `.yellow, moment().format('L [|] hh:mm:ss').green);
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

// define the about route
router.get('/about', function (req, res) {
  middleware.render(req, res, 'about.pug', {
    session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null
  });
});

router.get('/buffer', function (req, res) {
  logger.info('buffer requested !'.red);
  middleware.render(req, res, 'buffer.pug', {
    buffer: buffer.getBuffer(),
    session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null,
    view: 'buffer'
  });
});

router.get('/pending', function (req, res) {
  logger.info('pending buffer requested !'.red);
  middleware.render(req, res, 'buffer.pug', {
    buffer: buffer.pending(),
    session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null,
    view: 'pending'
  });
});

router.get('/set', function (req, res) {
  logger.info('aspired buffer requested !'.red);
  middleware.render(req, res, 'buffer.pug', {
    buffer: buffer.aspired(),
    session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null,
    view: 'set'
  });
});

router.get('/failed', function (req, res) {
  logger.info('failed buffer requested !'.red);
  middleware.render(req, res, 'buffer.pug', {
    buffer: buffer.failed(),
    session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null,
    view: 'failed'
  });
});

router.get('/search', function (req, res) {
  logger.info('search into buffer requested !'.red);
  middleware.render(req, res, 'buffer.pug', {
    buffer: buffer.search(req.query["q"]),
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
    session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null
  });
});

module.exports = router
