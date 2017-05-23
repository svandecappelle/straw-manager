var Moteur = require('../src/aspiration/sites/easyparapharmacie'),
  colors = require('colors');


var enseigne_lancher = new Moteur(true);
enseigne_lancher.call({
  url: "https://www.easyparapharmacie.com/"
});

var int_maximum_size = 100;
var counter = 0;

enseigne_lancher.on("done", function(data){
  counter += 1;
  console.log("data aspirées: ".red , data);
  if (counter >= int_maximum_size){
    console.log("Maximum limit atteinte".red.bold.underline);
    process.exit(1);
  }
});
