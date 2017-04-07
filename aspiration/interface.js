/*!
 * Optimix Aspiration
 * Author: Ahmed CHELBI <ahmad.chelbi@outlook.com>
 */

const path = require('path');
var cp = require('child_process');
var buffer = require('./../api/src/app/model/buffer')

function aspiration(){

}


aspiration.prototype.update = function (input) {
  // TODO: check meca

var requestID = input.requestID
var enseigne  = input.Enseigne
var MagasinId = input.MagasinId
var idProduit = input.idProduit
var url       = input.url


var script = path.resolve(__dirname, "./launch")

var child = cp.fork(script, [enseigne, MagasinId, idProduit, url, requestID], {silent:true});

child.on('message', function(m) {
  // Receive results from child process
  console.log('request executed: ', m.requestID);
  buffer.update(m)
});

};





module.exports = {
       init:function () {
          return new aspiration()
       }
};
