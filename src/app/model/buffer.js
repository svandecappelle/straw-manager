var _ = require('underscore'),
  nconf = require('nconf'),
  aspiration = require('./../../aspiration/interface');


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
        status        : 'pending',
        data          : {
        }
      };

      requestBuffer.push(newRq);
      
      if (nconf.get('aspiration').type === 'fork'){
        aspiration.update(newRq, function(results){
          Buffer.update(results, callback);
          if (callback){
            callback(results);
          }
        });
      } else {
        aspiration.launch(newRq, function(results){
          Buffer.update(results);
          if (callback){
            callback(results);
          }
        });
      }
    }
    return newRq;
  };


  Buffer.update = function update(object){
    // update data, set status and responseDate
    //

    var index = _.findIndex(requestBuffer, {requestID : Number.parseInt(object.requestID)})
    if (index > -1 && object.data && object.data.enseigne) {
      requestBuffer[index].status = 'set'
      requestBuffer[index].responseDate = Date.now()
      requestBuffer[index].data = object.data
    } else {
      requestBuffer[index].status = 'failed'
      requestBuffer[index].error = object.error
      requestBuffer[index].responseDate = Date.now()
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
    if (query && query.Enseigne && query.MagasinId && query.idProduit && query.url) {
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
