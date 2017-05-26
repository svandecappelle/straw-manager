var express = require('express'),
  router = express.Router(),
  buffer = require('./../model/buffer'),
  bodyParser = require('body-parser'),
  moment = require('moment'),
  nconf = require('nconf');
  logger = require("log4js").getLogger('app/routes/views');

router.use(bodyParser.urlencoded({
  extended: true
}));

router.use(bodyParser.json());

// middleware that is specific to this router
router.use(function timeLog (req, res, next) {
  logger.info('Views: Time: '.yellow, moment().format('L [|] hh:mm:ss').green);
  next();
});

// define the home page route
router.get('/', function (req, res) {
  res.render('index');
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

    res.render('request', elem);
});

module.exports = router
