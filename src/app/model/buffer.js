var _ = require('underscore'),
  nconf = require('nconf'),
  events = require('events'),
  aspiration = require('./../../aspiration/interface'),
  Exporter = new require('./../middleware/exporter');


/**************************************************************************
*                     SINGLETON CLASS DEFINITION                          *
***************************************************************************/

/*** element structure

{ requestID : auto_increment
  requestDate :
  responseDate :

  enseigne :
  MagasinId :
  idProduit :
  url :
  status :

  data : {
    ...
  }
}
**/


(function (Buffer) {
  "use strict";

  var requestBuffer = []
  var auto_increment = -1
  var eventEmitter = new events.EventEmitter();
  var exporter = new Exporter();

  eventEmitter.on('done', function(results){
    console.log("Aspiration done".cyan.bold, results.requestID);
    //Buffer.update(results, true);
    var index = _.findIndex(requestBuffer, {requestID : Number.parseInt(results.requestID)})
    if (requestBuffer[index].callback){
      if (requestBuffer[index].status !== 'partial_pending') {
        requestBuffer[index].status = 'set';
      } else {
        requestBuffer[index].status = 'partial_done';
      }
      requestBuffer[index].callback(results);
    }
  });

  eventEmitter.on('product', function(results){
    console.log("Aspiration of one product".cyan.bold, results.requestID);
    exporter.export(results.data);
    Buffer.update(results, false);
  });

  eventEmitter.on('not_found', function(results){
    console.log("Aspiration of one product is partial because of not found on a store".cyan.bold, results.requestID);

    Buffer.update(results, false);
  });

  eventEmitter.on('error', function(error, req){
    if (req.origin){
      req = req.origin;
    }
    console.log("Errors on aspiration".red, error, _.omit(req, ["aspired_stores", "stores", "stores_detail"]));
    Buffer.update(req);

    var index = _.findIndex(requestBuffer, {requestID : Number.parseInt(req.requestID)})
    if (index > -1){
      requestBuffer[index].error = error;
      if (requestBuffer[index].callback){
        requestBuffer[index].callback(requestBuffer[index]);
      }
    }
  });

  Buffer.pending_length = function(){
    return Buffer.pending().length;
  };

  Buffer.pending = function(){
    return _.union(_.where(requestBuffer, {status: 'pending'}), _.where(requestBuffer, {status: 'partial_pending'}));
  };

  Buffer.failed = function(){
    return _.where(requestBuffer, {status: 'failed'});
  };

  Buffer.aspired = function(){
    return _.union(_.where(requestBuffer, {status: 'set'}), _.where(requestBuffer, {status: 'partial_done'}));
  };

  Buffer.search = function(query){
    return _.filter(requestBuffer, function(elem){
      return JSON.stringify(elem).indexOf(query) !== -1;
    });
  }

  Buffer.add = function add(request, callback){
    auto_increment++;

    if (request) {
      var newRq = {
        requestID     : auto_increment,
        requestDate   : Date.now(),
        responseDate  : null,
        Enseigne      : request.Enseigne,
        MagasinId     : request.MagasinId,
        idProduit     : request.idProduit,
        url           : request.url,
        stores        : request.stores ? request.stores : null,
        status        : 'pending',
        aspired_stores: [],
        data          : {
        },
        callback      : callback
      };

      requestBuffer.push(newRq);

      aspiration.launch(newRq, eventEmitter);
    }
    return newRq;
  };

  Buffer.update = function update(object){
    // update data, set status and responseDate
    //

    var index = _.findIndex(requestBuffer, {requestID : Number.parseInt(object.requestID)});
    if (index > -1 && object.data && !_.isEmpty(object.data)) {

      requestBuffer[index].aspired_stores.push(object.data.magasin);

      if (object.stores && requestBuffer[index].stores === null){
        requestBuffer[index].stores = object.stores;
      }

      requestBuffer[index].responseDate = Date.now();

      if (object.data.magasin){
        requestBuffer[index].data = _.extend(requestBuffer[index].data, _.omit(object.data, ['prix', 'prixUnite', 'promo', 'promoDirecte', 'dispo']));

        if (!requestBuffer[index].stores_detail){
          requestBuffer[index].stores_detail = {};
        }

        requestBuffer[index].stores_detail[object.data.magasin.id] = object.data;
        _.sortBy(requestBuffer[index].stores_detail, function(value){
          return value.magasin.id;
        });
      } else {
        requestBuffer[index].data = object.data;
      }
    } else if (index > -1 && _.isEmpty(object.data) && object.req && object.req.magasin.id){
      if (requestBuffer[index].status === 'pending'){
        requestBuffer[index].status = 'partial_pending';
      }
      if (!requestBuffer[index].not_found_in_stores){
        requestBuffer[index].not_found_in_stores = [];
      }
      requestBuffer[index].not_found_in_stores.push(object.req.magasin.id);
    } else if (index > -1){
      requestBuffer[index].status = 'failed';
      requestBuffer[index].error = object.error;
      requestBuffer[index].responseDate = Date.now();
      console.log(`Request: ${object.requestID} failed: `.red.bold.underline, _.omit(requestBuffer[index], ['stores_detail', 'stores', 'aspired_stores']));
    }
  };


  Buffer.getElementByRequestID = function getElementByRequestID(object) {
    var index = _.findIndex(requestBuffer, {requestID : Number.parseInt(object.requestID)})
    return  index > -1 ? requestBuffer[index]: undefined;
  };

  Buffer.getBuffer = function getBuffer() {
    return requestBuffer;
  };

  Buffer.validQuery = function validQuery(query) {
    if (query && query.Enseigne && query.idProduit && query.url) {
      return true
    } else {
      return false
    }
  };

  Buffer.drop = function drop(object) {
    var index = _.findIndex(requestBuffer, {requestID : Number.parseInt(object.requestID)})
    if (  index > -1 ) {
      requestBuffer.splice(index, 1)
      return true
    }else {
      return false
    }
  };

}(exports));
