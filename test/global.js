var chai = require('chai'),
    request = require('request');
var expect = chai.expect; // we are using the "expect" style of Chai

const $url_api = 'http://localhost:65000';

describe('POSTs tests', function() {
  this.timeout(8000);
  it('Post should return in non interactive mode a request pending object', function(done) {
    
    var opts = {
      "Enseigne":"Bricoman",
      "MagasinId":"1",
      "idProduit":"519260",
      "url":"https://www.bricoman.fr/porte-de-garage-sectionnelle-motorisee-blanche-h200xl300.html"
    };
    // "idProduit":"519260",l

    request.post( $url_api.concat('/api/update'), { json : opts }, function (error, response, body) {
        if (!error && response) {
            if (response.statusCode == 200){
                done(response.body.status === 'pending' || response.body.status === 'set' ? undefined : response.body);
            } else {
                done(response.body);
            }
        } else {
            done(error);
        }
    });
  });
});