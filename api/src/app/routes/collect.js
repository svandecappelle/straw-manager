var express = require('express')
var router = express.Router()
var buffer = require('./../model/buffer')
var bodyParser = require('body-parser')
var chalk = require('chalk');
var moment = require('moment');

var GREEN = chalk.bold.green;
var RED = chalk.bold.red;
var YELLOW = chalk.bold.yellow;


router.use(bodyParser.urlencoded({
  extended: true
}));

router.use(bodyParser.json());

// middleware that is specific to this router
router.use(function timeLog (req, res, next) {
  console.log(YELLOW('Time: '), GREEN(moment().format('L [|] hh:mm:ss')))
  //console.log(YELLOW('Time: '), GREEN(moment().format('MMMM Do YYYY, h:mm:ss a')))
  next()
})

// define the home page route
router.get('/', function (req, res) {
  res.send('collectOnline API home page')
})
// define the about route
router.get('/about', function (req, res) {
  res.status(200).send('API description !')
})

router.get('/buffer', function (req, res) {
  console.log(RED('buffer requested !'));
  res.status(200).send(buffer.getBuffer())
})

router.get('/request/:id', function (req, res) {

    var elem = buffer.getElementByRequestID({
                  "requestID":req.params.id
               })
    if (elem) {
      console.log(RED(req.params.id)+" sended");
      res.status(200).send(elem);
    } else {
      console.log(RED(req.params.id)+" not found");
      res.status(404).send({"Error":"the requested ID, doesn't exists"});
    }

});
// delete element
router.delete('/drop/:id', function (req, res) {
 console.log(RED(req.params.id)+" to delete !");
  var elem = buffer.drop({
                "requestID":req.params.id
             })

  if (elem) {
    console.log(RED(req.params.id)+" deleted");
    res.status(200).send({"deleted"       :req.params.id,
                          "bufferLength"  :buffer.getBuffer().length
                         });
  }else {
    console.log(RED(req.params.id)+" not found");
    res.status(404).send({"Error":"a valid ID must be choosen"})
  }



});

router.post('/update', function (req, res) {
    var tempo = req.body
    console.log(RED('server received :'), tempo);
    if (buffer.validQuery(tempo)) {
      var elem = buffer.add(req.body)
      res.status(200).send(elem)
    }else {
      res.status(400).send({"Error":"a valid query must be a JSON that contains: Enseigne, MagasinId, idProduit and url"})
    }
})


module.exports = router
