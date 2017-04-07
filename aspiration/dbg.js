/*!
 * Optimix Aspiration
 * Author: Gautier Fauchart <gautier.fauchart@gmail.com>
 * MIT Licensed
 */

/*

 console.log('hello');
 console.log(process.argv);
 process.exit()
*/

const path = require('path');

console.red = function(text){
    console.log("[31m" + text + "[0m");
}


process.send = function(data){
  console.log(data);
}

engine = require(path.resolve(__dirname, "./src/engine/engine"));

if (process.argv.length > 2){
    var enseigne  = process.argv[2];
    engine._init(enseigne);
    var obj = require(path.resolve(__dirname,"./src/sites/" + enseigne));

    var param = {}
    param.idProduit =''
    param.Enseigne =''
    param.url =''
    param.MagasinId =''
    param.requestID = null

    try {
      param.Enseigne = process.argv[2]
      param.MagasinId = process.argv[3]
      param.idProduit = process.argv[4]
      param.url = process.argv[5]
      param.requestID = process.argv[6]

    } catch (e) {
      console.log("please check the param [Enseigne, MagasinId, idProduit, url, requestID]");
    }

    obj.debug(param);
} else {
    console.log("launch: [enseigne]");
    process.exit(1);
}
