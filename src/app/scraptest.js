var aspiration = require('./../../../aspiration/interface').init()
var buffer = require('./model/buffer')

var request = {
  Enseigne:'Bricoman',
  MagasinId:'1',
  idProduit:'289961',
  url:'https://www.bricoman.fr/joint-de-dilatation-pvc.html'
}

var request2 = {
  Enseigne:'Bricoman',
  MagasinId:'1',
  idProduit:'519260',
  url:'https://www.bricoman.fr/porte-de-garage-sectionnelle-motorisee-blanche-h200xl300.html'
}



aspiration.update(buffer.add(request))
aspiration.update(buffer.add(request2))




//console.log("getElementByRequestID", buffer.getElementByRequestID({requestID:3}));
//console.log("getElementByRequestID", buffer.getElementByRequestID({requestID:0}));
