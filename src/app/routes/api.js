var express = require('express'),
  router = express.Router(),
  buffer = require('./../model/buffer'),
  bodyParser = require('body-parser'),
  chalk = require('chalk'),
  moment = require('moment'),
  nconf = require('nconf');
  ora = require('ora'),
  logger = require("log4js").getLogger('app/routes/api');

var GREEN = chalk.bold.green;
var RED = chalk.bold.red;
var YELLOW = chalk.bold.yellow;


router.use(bodyParser.urlencoded({
  extended: true
}));

router.use(bodyParser.json());

// middleware that is specific to this router
router.use(function timeLog (req, res, next) {
  if (req.url !== '/status'){
    logger.info('Time: '.yellow, moment().format('L [|] hh:mm:ss').green);
  }
  next();
});

// define the home page route
router.get('/', function (req, res) {
  res.send('collectOnline API home page')
});

router.get('/status', function(req, res){
  res.send({
    bufferLength: buffer.getBuffer().length,
    pending: buffer.pending().length,
    set: buffer.aspired().length,
    failed: buffer.failed().length
  });
});

// define the about route
router.get('/about', function (req, res) {
  res.status(200).send('API description !')
});

router.get('/buffer', function (req, res) {
  logger.info('buffer requested !'.red);
  res.status(200).send(buffer.getBuffer())
});


router.get('/pending', function (req, res) {
  logger.info('pending buffer requested !'.red);
  res.send(buffer.pending());
});

router.get('/set', function (req, res) {
  logger.info('aspired buffer requested !'.red);
  res.send(buffer.aspired());
});

router.get('/failed', function (req, res) {
  logger.info('failed buffer requested !'.red);
  res.send(buffer.failed());
});

router.get('/search', function (req, res) {
  logger.info(`search into buffer requested ! ${req.query["q"]}`.red);
  res.send(buffer.search(req.query["q"]));
});

router.get('/request/:id', function (req, res) {

    var elem = buffer.getElementByRequestID({
      "requestID":req.params.id
    });

    if (elem) {
      logger.info("".concat(req.params.id).red + " sended");
      res.status(200).send(elem);
    } else {
      logger.warn("".concat(req.params.id).red + " not found");
      res.status(404).send({"Error":"the requested ID, doesn't exists"});
    }

});
// delete element
router.delete('/drop/:id', function (req, res) {
 logger.info("".concat(req.params.id).red + " to delete !");
  var elem = buffer.drop({
    "requestID":req.params.id
  });

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
var spinner = ora('Aspire informations... [' + buffer.pending_length() + ']\r')

router.post('/update', function (req, res) {
    var tempo = req.body
    logger.info('server received :'.red, tempo);
    if (buffer.validQuery(tempo)) {
      logger.info("querying aspiration...");
      spinner.start();
      spinner.text = 'Aspire informations... [' + buffer.pending_length() + ']\r';

      if (nconf.get("aspiration:interactive")) {
        // Mode interactive activated: The result is returned into POST return call.
        var elem = buffer.add(req.body, function(results){
          console.log("pending buffer: ".concat(buffer.pending_length()).green.bold);
          if (buffer.pending_length() === 0){
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

        var elem = buffer.add(req.body, function(results){

          console.log("pending buffer: ".concat(buffer.pending_length()).green.bold);
          if (buffer.pending_length() === 0){
            spinner.stop();
          } else {
            spinner.text = 'Aspire informations... [' + buffer.pending_length() + ']\r';
          }
          logger.info("results are now accessibles");
        });

        res.status(200).send(elem);
      }

    } else {
      res.status(400).send({"Error":"a valid query must be a JSON that contains: Enseigne, MagasinId, idProduit and url"})
    }
});


module.exports = router