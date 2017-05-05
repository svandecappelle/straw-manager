const readline = require('readline');
const request = require('request');

const $url_api = 'http://localhost:65000';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("Testing interactive aspiration")

var current_enseigne = '',
    magasin_id = '',
    id_produit = '',
    url = ''
    params = [];

var questions = [`Enseigne [${current_enseigne}]*: `, `MagasinId [${magasin_id}]: `, `idProduit [${id_produit}]: `, `url [${url}]:`];


function continue_test(){
    rl.question('Ask another test ? Y/n ', (continue_response) => {
        if (continue_response === 'Y'){
            launch();
        } else {
            console.log('Thank you for your valuable feedback');
            rl.close();
        }
    });
}

function doPost(){
    current_enseigne = params[0];
    magasin_id = params[1];
    id_produit = params[2];
    url = params[3];
    
    var opts = {
        Enseigne: current_enseigne,
        MagasinId: magasin_id,
        idProduit: id_produit,
        url: url
    };
    console.log("CALL API aspiration: ", opts);
    request.post( $url_api.concat('/api/update'), { json : opts }, function (error, response, body) {
        console.log(response);
        if (!error && response.statusCode == 200) {
            console.log(body)
        } else {
            console.log(error);
        }

        continue_test();
    });

};

function ask(param_num){
    if (param_num === questions.length) {
        doPost();
    } else {
        rl.question(questions[param_num], (answer) => {
            if (answer && answer !== ''){
                params[param_num] = answer;    
            }
            ask(param_num+=1);
        });
    }
}

function launch(){
    console.log('test started');
    ask(0);
};

launch();
