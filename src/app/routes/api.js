const express = require('express');
const router = express.Router();
const buffer = require('./../model/buffer');
const bodyParser = require('body-parser');
const chalk = require('chalk');
const moment = require('moment');
const proxyUpdater = require('../../proxy-update');
const nconf = require('nconf');
const _ = require('lodash');
const underscore = require('underscore');
const fs = require('fs');
const logger = require("log4js").getLogger('app/routes/api');
const tmp = require('tmp');

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
    logger.debug('Time: '.yellow, moment().format('L [|] hh:mm:ss').green);
  }
  next();
});

// define the home page route
router.get('/purge', function (req, res) {
  if (req.session && req.session.passport && req.session.passport.user) {
    var flyshType = req.query.type;
    buffer.flush(flyshType);
    res.json({
      status: 200,
      message: 'done'
    });
  } else {
    res.status(401).json({
      status: 401,
      error: 'Not authorized'
    })
  }
});

// define the home page route
router.get('/', function (req, res) {
  res.send('straw-manager API home page')
});

// define the home page route
router.get('/proxies-update', function (req, res) {
  proxyUpdater.update();
  res.send({message: 'done'});
});

router.get('/status', function(req, res){
  buffer.getBuffer().then( (buffer) => {
    
    let bufferPending = underscore.where(buffer, { status: 'pending' });
    let bufferPartialPending = underscore.where(buffer, { status: 'partial_pending' });
    let pending = underscore.union(bufferPending, bufferPartialPending);

    let bufferFailed = underscore.where(buffer, { status: 'failed' });
    let bufferTimeout = underscore.where(buffer, { status: 'timeout' });
    let failed = underscore.union(bufferFailed, bufferTimeout);

    let bufferSet = underscore.where(buffer, { status: 'set' });
    let bufferPartialDone = underscore.where(buffer, { status: 'partial_done' });
    let set = underscore.union(bufferSet, bufferPartialDone);

    res.send({
      bufferLength: buffer.length,
      pending: pending.length,
      set: set.length,
      failed: failed.length
    });
  }).catch( (error) => {
    logger.error(error);
    res.send({
      bufferLength: 0,
      pending: 0,
      set: 0,
      failed: 0
    });
  });
});

// define the about route
router.get('/about', function (req, res) {
  res.status(200).send('API description !')
});

router.get('/buffer', function (req, res) {
  logger.debug('buffer requested !'.red);
  buffer.getBuffer().then( (bufferValues) => {
    res.status(200).send(bufferValues);
  })
  .catch( (error) => {
    logger.error(error);
    res.status(500).send(error);
  });
});


router.get('/buffer/:status', function (req, res) {
  let status = req.params.status;

  logger.debug(`${status} buffer requested !`.red);
  
  switch (status) {
    case "pending":
    case "failed":
    case "set":
      buffer[status]().then( (buffer) => {
        res.send(buffer);
      });
      break;
    default:
      buffer.aspired().then( (buffer) => {
        res.send(buffer);
      });
      break;
  }
});

router.get('/search', function (req, res) {
  logger.debug(`search into buffer requested ! ${req.query["q"]}`.red);

  buffer.search(req.query["q"]).then( (bufferList) => {
    res.send(bufferList);
  }).catch((error) => {
    logger.error(error);
    res.send({});
  });
});

router.get('/request/:id', function (req, res) {
  buffer.getElementByRequestID({
    "requestID":req.params.id,
    start: 0
  }).then( (result) => {
    logger.debug(`${req.params.id.red} sended`);
    res.status(200).send(result);
  }).catch( (error) => {
    logger.warn(`${req.params.id.red} not found`);
    res.status(404).send({"Error":"the requested ID, doesn't exists"});
  });
});

router.get('/request/:id/details/:start', function (req, res) {
  buffer.getElementByRequestID({
    "requestID":req.params.id,
    start: parseInt(req.params.start)
  }).then( (result) => {
    logger.debug(`${req.params.id.red} sended`);
    res.status(200).send(result);
  }).catch( (error) => {
    logger.warn(`${req.params.id.red} not found`);
    res.status(404).send({"Error":"the requested ID, doesn't exists"});
  });
});

router.get('/request/:id/details/:start/:filter', function (req, res) {
  buffer.getElementByRequestID({
    "requestID":req.params.id,
  }).then( (result) => {

    let filteredPages = _.filter(result.pages_detail, (element) => {
      return JSON.stringify(element).toLowerCase().indexOf(req.params.filter.toLowerCase()) !== -1;
    });

    result.filtered_pages = filteredPages.length;
    filteredPages = _.drop(filteredPages, parseInt(req.params.start))
    result.pages_detail = _.take(filteredPages, 50);
    
    logger.debug(`${req.params.id.red} sended`);
    res.status(200).send(result);

  }).catch( (error) => {
    logger.warn(`${req.params.id.red} not found`, error);
    res.status(404).send({"Error":"the requested ID, doesn't exists"});
  });
});

router.get('/request/export/:id', function (req, res) {
  buffer.getElementByRequestID({
    "requestID":req.params.id,
  }).then( (result) => {
    logger.debug(`${req.params.id.red} sended`);
    res.attachment('export.csv');
    
    tmp.file({postfix: '.csv'}, function (err, path, fd, cleanupCallback) {
      if (err) throw err;
  
      console.log("File: ", path);
      console.log("Filedescriptor: ", fd);
      if (result.pages_detail.length > 0) {
        fs.writeSync(fd, _.keys(result.pages_detail[0]).join(';')+"\n"); 
        _.each(result.pages_detail, (element) => {

          var lineValues = _.values(element);
          lineValues = _.map(lineValues, (element) => {
            return JSON.stringify(element.toString().replace(/\"/g, "'"));
          });

          fs.writeSync(fd, lineValues.join(';').concat("\n"));
        });
      }
      const src = fs.createReadStream(path);
      src.pipe(res);
    });

  }).catch( (error) => {
    logger.warn(`${req.params.id.red} not found`, error);
    res.status(404).send({"Error":"the requested ID, doesn't exists"});
  });
});


router.get('/request/export/:id/details/:filter', function (req, res) {
  buffer.getElementByRequestID({
    "requestID":req.params.id,
  }).then( (result) => {

    let filteredPages = _.filter(result.pages_detail, (element) => {
      return JSON.stringify(element).toLowerCase().indexOf(req.params.filter.toLowerCase()) !== -1;
    });

    result.pages_detail = filteredPages;
    result.filtered_pages = filteredPages.length;

    logger.debug(`${req.params.id.red} sended`);
    
    res.attachment('export.csv');
    tmp.file({postfix: '.csv'}, function (err, path, fd, cleanupCallback) {
      if (err) throw err;
  
      console.log("File: ", path);
      console.log("Filedescriptor: ", fd);
      if (result.pages_detail.length > 0) {
        fs.writeSync(fd, _.keys(result.pages_detail[0]).join(';')+"\n"); 
        _.each(result.pages_detail, (element) => {
          
          var lineValues = _.values(element);
          lineValues = _.map(lineValues, (element) => {
            return JSON.stringify(element.toString().replace(/\"/g, "'"));
          });

          fs.writeSync(fd, lineValues.join(';').concat("\n"));
        });
      }
      const src = fs.createReadStream(path);
      src.pipe(res);
    });

  }).catch( (error) => {
    logger.warn(`${req.params.id.red} not found`, error);
    res.status(404).send({"Error":"the requested ID, doesn't exists"});
  });
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
router.post('/update', function (req, res) {
    var tempo = req.body
    logger.info('server received :'.red, tempo);
    if (buffer.validQuery(tempo)) {
      logger.info("querying crawler...");

      if (nconf.get("crawler:interactive")) {
        // Mode interactive activated: The result is returned into POST return call.
        var elem = buffer.add(req.body, function(results){
          console.log("pending buffer: ".concat(buffer.pending_length()).green.bold);
          logger.info("results sent");
          res.status(200).send(results);
        });
      } else {
        // Mode interactive activated: The result is not returned into POST return call.
        // User need to call buffer to now the status.
        var elem = buffer.add(req.body, function(results){
          console.log("pending buffer: ".concat(buffer.pending_length()).green.bold);
          logger.info("results are now accessibles");
        });

        res.status(200).send(elem);
      }

    } else {
      res.status(400).send({"Error":"a valid query must be a JSON that contains: Enseigne, MagasinId, idProduit and url"})
    }
});

router.get('/cancel/:id', function (req, res) {
  logger.info("".concat(req.params.id).red + " to stop !");
  buffer.stop(parseInt(req.params.id));
  res.redirect(`/request/${req.params.id}`);
});

module.exports = router
