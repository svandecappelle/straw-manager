var _ = require('underscore')
var aspiration = require('./../../../../aspiration/interface').init()


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


var requestBuffer = []
var auto_increment = -1

exports.add = function add(request){
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
    aspiration.update(newRq)

  }
  return newRq;
}


exports.update = function update(object){
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

}


exports.getElementByRequestID = function getElementByRequestID(object) {
  var index = _.findIndex(requestBuffer, {requestID : Number.parseInt(object.requestID)})
  return  index > -1 ? requestBuffer[index]: undefined;
}

exports.getBuffer = function getBuffer() {
  return requestBuffer;
}

exports.validQuery = function validQuery(query) {
  if (query && query.Enseigne && query.MagasinId && query.idProduit && query.url) {
    return true
  } else {
    return false
  }
}
