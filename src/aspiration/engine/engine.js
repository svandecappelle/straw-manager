/*!
 * Optimix Aspiration
 * Author: Gautier Fauchart <gautier.fauchart@gmail.com>
 * MIT Licensed
 */

var _ = require("lodash");
var Q = require("q")
var builder = require('xmlbuilder');
var crypto = require("crypto")
var querystring = require("querystring");

function Engine(){
}

Engine.init = function(){}

Engine.setProxyList = function(){};
Engine.setParallelRequest = function(){};
Engine.getidxProduit = function(){};
Engine.export_products = function(a,b){ this.output.exportProducts(a,b) };
Engine.export_toys = function(a,b){ this.output.exportToys(a,b) };
Engine.export_location = function(a,b){ this.output.exportLocation(a,b) };
Engine.export_carburant = function(a,b){ this.output.exportCarburant(a,b) };

Engine._init = function(enseigne){
  this.config  = require("./config").create(enseigne).config;
  this.output  = require("./output").create(enseigne, this.config);
  this.manager = require("./manager").create(enseigne, this.config, this.output);
  this.URLSupATraiter = 1;
}

Engine.request = function(url, opt, post, cb, params){
    if (this.inLimit(params) == false){
	console.red("not in my limits")
	return;
    }
    if (params.treeId && params.treeId.length > 1){
	console.log(params.treeId);
	//process.exit(0);
    }

    // if (this.config.contact)
    // 	params.retrieveContacts = true;
    // if (!params.config){
    //     params.config = this.config;
    // }
    params = _.cloneDeep(params);
    if (params.jar == undefined)
        params.jar = {};
    params.lasturl = url;

    if (post === {})
        post = ""
    else if (typeof post == "object")
        post = querystring.stringify(post);



    var token =  crypto.randomBytes(32).toString("hex");
    params.promiseToken  = token;
    var xmlbuilder = {
	request: {
	    url :       {'#text': JSON.stringify(url)},
	    opt :       {'#text': JSON.stringify(opt)},
	    post :      {'#text': JSON.stringify(post)},
	}
    };
    return this.manager.AddRequest(params, token, cb, xmlbuilder);
}

Engine.inLimit = function(param){

  var limiter = this.config.limit_nomenclature;

  var checktree = param.tree;
  if (limiter){
    var id0  = limiter[0].split(";")[0];
    if (parseInt(id0).toString() == id0)
      checktree = param.treeId;
  }

  if (limiter && checktree)
  {
    var passed = true;
    for (i in limiter){
      var passed = true;
      var frais = limiter[i].split(";");
      for (var j = 0; j < checktree.length; j++){
        if (frais[j] && frais[j] != checktree[j]){
          passed = false;
          break;
        }
      }
      if (passed == true)
        break;
      passed = false;
    }
    if (passed == false){
      //console.red("not passed: " + checktree);
      //process.exit(0);
      return false;
    }
    console.red("passed: " + checktree)
  }
  return true;
}

Engine.BindRequest = Engine.request;
Engine.BindRequestWithJar = Engine.request;
Engine.clone =  _.cloneDeep;
Engine.AddRequest = Engine.BindRequest;

Engine.shouldBeDone = function(magId){
    var magId = magId.toString();

    /* Si on limite le nombre de magasin a traiter lors de l'exécution du script */
    /* Dès que l'on a fini de traiter le nombre de magasin, on ne prend plus de nouveaux magasins */
    if ((this.config.limiter_nb_magasin_script > 0) && (this.manager.nbMagTraite >= this.config.limiter_nb_magasin_script))
      return false;


    doThisMag = true;
    dontDoThisMag = false;


    if (this.config.list_mag_todo !== undefined)
      doThisMag = this.config.list_mag_todo.indexOf(magId) != -1;
    /*si il est dans la liste a faire: true*/

    if (this.config.list_mag_notdo !== undefined)
      dontDoThisMag = this.config.list_mag_notdo.indexOf(magId) > -1;
      /* si il n'est pas dans la liste a ne pas faire: true*/


      //console.log("===> "+magId+"  DO:"+doThisMag+" [==============] NOT DO: "+dontDoThisMag+"   | "+this.config.list_mag_notdo.indexOf(magId));
    /*
      _______________________________
      [   DO    |   NOT   | RETURN  ]
      ---------- --------- ----------
      |____0____|____0____|____0____|
      |____0____|____1____|____0____|
      |____1____|____0____|____1____|
      |____1____|____1____|____0____|
      |___null__|___null__|____1____|

    */


    //if ((doThisMag && dontDoThisMag) || (!doThisMag && !dontDoThisMag)) {
    if (doThisMag && dontDoThisMag){
      return false
    }else if (doThisMag) {
      return true
    }else if (!doThisMag) {
      return false
    }else if (dontDoThisMag) {
      return false
    }else {
      return true
    }



}

Engine.isFrais = function(param){
  limiter = this.config.produit_frais;
  if (!limiter)
    return false;

  var checktree = param.tree;
  if (limiter){
    var id0  = limiter[0].split(";")[0];
    if (parseInt(id0).toString() == id0)
      checktree = param.treeId;
  }

  if (limiter && checktree)
  {
    var passed = true;
    for (i in limiter){
      var passed = true;
      var frais = limiter[i].split(";");
      for (var j = 0; j < checktree.length; j++){
	if (frais[j] && frais[j] != checktree[j]){
	  passed = false;
          break;
        }
      }
      if (passed == true)
        break;
      passed = false;
    }
    if (passed == false){
      // console.log(checktree);
      // process.exit(0);
      return false;
    }
    return true;
    console.red("passed: " + checktree)
  }
}

Engine.TraiterUrlSupplementaire = function(objInit, callbackProduit) {
  // Permet de traiter des URL forcées C'est à dire qui ne sont pas traitées par le moteur
  // mais qui existent sur le site et qu'il faut aspirer
  if (this.URLSupATraiter === 1) {
    // Le test URLSupATraiter permet de ne traiter les URL forcées qu'une seule fois lors de l'exécution du script
    this.URLSupATraiter = 0;
    URLSup = this.config.liste_url_forces;
    if (URLSup){
      // On parcours le fichier avec les URL supplémentaires
      for (var i = 0; i < URLSup.length; i++){
        var valeurLigne = URLSup[i].split(';');
        newObj = this.clone(objInit);
        newObj.tree = [];
        newObj.tree.push(valeurLigne[0]);
        newObj.tree.push(valeurLigne[1]);
        newObj.tree.push(valeurLigne[2]);
        url = valeurLigne[3];
        console.log('Traitement URL Sup =>' + url)
        this.AddRequest(url, {}, {}, callbackProduit, newObj);
      }
    }
  }
}

// Dev XLB
Engine.GetListEAN = function() {
    var ean = this.config.list_ean;
    return ean;
}

Engine.GetListUrls = function() {
    return  this.config.divers_list;;
}



Engine.logError = function(){}

module.exports = Engine;
