var express = require('express'),
  router = express.Router(),
  buffer = require('./../model/buffer'),
  bodyParser = require('body-parser'),
  moment = require('moment'),
  _ = require("underscore"),
  nconf = require('nconf'),
  logger = require("log4js").getLogger('app/routes/views');
const LOG_ALL_VIEWS_ACCESS = false;
router.use(bodyParser.urlencoded({
  extended: true
}));

router.use(bodyParser.json());

// middleware that is specific to this router
if (LOG_ALL_VIEWS_ACCESS){
  router.use(function timeLog (req, res, next) {
    logger.info('Views: Time: '.yellow, moment().format('L [|] hh:mm:ss').green);
    next();
  });
}

router.use(function timeLog (req, res, next) {
  logger.info(req.url);
  if (req.session && req.session.passport && req.session.passport.user){
    next();
  } else if (req.url.indexOf("login") === -1) {
    logger.warn('Not Connected user Time: '.yellow, moment().format('L [|] hh:mm:ss').green);
    req.session.urlfrom = req.url;
    res.redirect('/login');
  } else {
    next();
  }
});

// define the home page route
router.get('/', function (req, res) {
  res.render('index', {
    bufferLength: buffer.getBuffer().length,
    pending: buffer.pending().length,
    set: buffer.aspired().length,
    failed: buffer.failed().length,
    session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null
  });
});

// define the about route
router.get('/about', function (req, res) {
  res.render('about', {
    session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null
  });
});

router.get('/buffer', function (req, res) {
  logger.info('buffer requested !'.red);
  res.render('buffer', {
    buffer: buffer.getBuffer(),
    session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null,
    view: 'buffer'
  });
});

router.get('/pending', function (req, res) {
  logger.info('pending buffer requested !'.red);
  res.render('buffer', {
    buffer: buffer.pending(),
    session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null,
    view: 'pending'
  });
});

router.get('/set', function (req, res) {
  logger.info('aspired buffer requested !'.red);
  res.render('buffer', {
    buffer: buffer.aspired(),
    session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null,
    view: 'set'
  });
});

router.get('/failed', function (req, res) {
  logger.info('failed buffer requested !'.red);
  res.render('buffer', {
    buffer: buffer.failed(),
    session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null,
    view: 'failed'
  });
});

router.get('/search', function (req, res) {
  logger.info('search into buffer requested !'.red);
  res.render('buffer', {
    buffer: buffer.search(req.query["q"]),
    session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null,
    view: `search?q=${req.query["q"]}`
  });
});

router.get('/request/:id', function (req, res) {
    var elem = buffer.getElementByRequestID({
      "requestID":req.params.id
    });

    res.render('request', {
      request: elem ,
      session: req.session && req.session.passport && req.session.passport.user ? req.session.passport.user : null
    });
});

module.exports = router
