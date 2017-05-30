var express = require('express'),
  router = express.Router(),
  buffer = require('./../model/buffer'),
  bodyParser = require('body-parser'),
  moment = require('moment'),
  nconf = require('nconf');
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

// define the home page route
router.get('/', function (req, res) {
  res.render('index', {
    bufferLength: buffer.getBuffer().length,
    pending: buffer.pending().length,
    set: buffer.aspired().length,
    failed: buffer.failed().length
  });
});

// define the about route
router.get('/about', function (req, res) {
  res.render('about');
});

router.get('/buffer', function (req, res) {
  logger.info('buffer requested !'.red);
  res.render('buffer', {buffer: buffer.getBuffer()});
});

router.get('/request/:id', function (req, res) {
    var elem = buffer.getElementByRequestID({
      "requestID":req.params.id
    });

    res.render('request', {
      request: elem
    });
});

module.exports = router
