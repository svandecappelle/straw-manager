var express = require('express'),
  router = express.Router(),
  buffer = require('./../model/buffer'),
  bodyParser = require('body-parser'),
  chalk = require('chalk'),
  moment = require('moment'),
  nconf = require('nconf');
  ora = require('ora'),
  logger = require("log4js").getLogger('engine/collect');

var GREEN = chalk.bold.green;
var RED = chalk.bold.red;
var YELLOW = chalk.bold.yellow;


router.use(bodyParser.urlencoded({
  extended: true
}));

router.use(bodyParser.json());

// middleware that is specific to this router
router.use(function timeLog (req, res, next) {
  logger.info(YELLOW('Time: '), GREEN(moment().format('L [|] hh:mm:ss')))
  //console.log(YELLOW('Time: '), GREEN(moment().format('MMMM Do YYYY, h:mm:ss a')))
  next()
});

// define the home page route
router.get('/', function (req, res) {
  res.send('collectOnline API home page')
});

// define the about route
router.get('/about', function (req, res) {
  res.status(200).send('API description !')
});

router.get('/buffer', function (req, res) {
  logger.info(RED('buffer requested !'));
  res.status(200).send(buffer.getBuffer())
});

router.get('/request/:id', function (req, res) {

    var elem = buffer.getElementByRequestID({
      "requestID":req.params.id
    });

    if (elem) {
      logger.info(RED(req.params.id)+" sended");
      res.status(200).send(elem);
    } else {
      logger.warn(RED(req.params.id)+" not found");
      res.status(404).send({"Error":"the requested ID, doesn't exists"});
    }

});
// delete element
router.delete('/drop/:id', function (req, res) {
 logger.info(RED(req.params.id)+" to delete !");
  var elem = buffer.drop({
    "requestID":req.params.id
  });

  if (elem) {
    logger.info(RED(req.params.id)+" deleted");
    res.status(200).send({"deleted"       :req.params.id,
                          "bufferLength"  :buffer.getBuffer().length
                         });
  } else {
    logger.warn(RED(req.params.id)+" not found");
    res.status(404).send({"Error":"a valid ID must be choosen"})
  }
});

router.post('/update', function (req, res) {
    var tempo = req.body
    logger.info(RED('server received :'), tempo);
    if (buffer.validQuery(tempo)) {
      logger.info("querying aspiration...");
      var spinner = ora('Aspire informations...').start();

      if (nconf.get("aspiration:interactive")){
        // Mode interactive activated: The result is returned into POST return call.
        var elem = buffer.add(req.body, function(results){
          spinner.stop();
          logger.info("results sent");
          res.status(200).send(results);
        });
      } else {

        // Mode interactive activated: The result is not returned into POST return call.
        // User need to call buffer to now the status.

        var elem = buffer.add(req.body, function(results){
          spinner.stop();
          logger.info("results are now accessibles");
        });

        res.status(200).send(elem);
      }

    } else {
      res.status(400).send({"Error":"a valid query must be a JSON that contains: Enseigne, MagasinId, idProduit and url"})
    }
});

module.exports = router
