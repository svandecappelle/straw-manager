var cheerio = require('cheerio');
var dateFormat = require('dateformat');
var outils = require("../engine/outils");
var htmlToText = require('html-to-text');
var encodeURISafe = require('encodeuri-safe');
var xlblogger = require('xlblogger');
var logger = new xlblogger("MrBricolage");

var name = "MrBricolage";


function getDetailArticles(html, obj){
  var $ = cheerio.load(html);
  ReqObject = engine.clone(obj);
	var data = {};

  /* ------------------------------------------------------------------------ */
  // manage fail
  if (!($('#fiche .bloc-price-fiche .price').text().trim())) {

    process.send({
      requestID  :  ReqObject.requestID,
      error      :	"produit sans prix",
      data       :  undefined
    })

    process.exit(1); // important !!
  }
  /* ------------------------------------------------------------------------ */

  data.timestamp = +(new Date());
  data.enseigne = obj['Enseigne'];
  data.magasin = 'Mr.Bricolage ' + $('#bloc-logo-haut .logo-local').text().trim();
  data.magasinId = ReqObject.MagId;
  data.categories= []

  $('#chemindefer li').each(function (i) {
    if (i==0 || i== $('#chemindefer  li').length-1) {
      return
    }else {
      data.categories.push($(this).text().trim());
    //  console.log(data.categories +' '+i);

    }
  })

  data.libelles = [];
  data.libelles.push($('#fiche [itemprop="name"]').text().trim())
  data.idProduit = html.split('productId: "')[1].split('"')[0];
  data.lienProduit = ReqObject.lookup
  data.srcImage = $('#fiche #visuelprincipal').attr('src');
  data.prix = $('#fiche .bloc-price-fiche .price').text().trim();
  data.ancienPrix = $('#fiche .bloc-price-fiche .prixbare').text().trim();
  data.marque = $('#fiche .marque img').attr('alt');
  data.promo = (data.ancienPrix || data.promoDirecte) ? 1: 0;
  data.caracteristique = [];
    var champ = "";
    var valeur = "";
    //console.log('on liste les caractéristique du produit ', data.idProduit);
    $("#tab-container #tabs-caracteristiques table tr").each(function(){
      champ = $(this).find("td.valign-top").text().trim();
      valeur = $(this).find("td.last").text().trim();
      valeur = outils.replaceAll('\r', '', valeur);
      valeur = outils.replaceAll('\n', '', valeur);
      valeur = outils.replaceAll('\t', ';', valeur);
      data.caracteristique.push(champ + ' : ' + valeur);
      // idproduit ==> id="product-" ; idproduit2==> Référence produit ; origine ==> Code ANPF ;
      if (champ === "EAN") data.ean = valeur;
      //if (champ === "Référence produit") {data.idProduit2 = data.idProduit; data.idProduit = valeur;}
      if (champ === "Référence produit") { data.cip7 = valeur }
      if (champ ==="Code ANPF"){ data.cip13 = valeur }
    });

  var carac = $("#descriptionlongue").html()

  var text = htmlToText.fromString(carac, { wordwrap: false });
  //console.log(text);
  text = text.replace(/\n/g, " ").replace(/\r/g, " ").trim()
  //data.carac = $("#descriptionlongue").text().replace(/\n/g, " ").replace(/\r/g, " ").trim();
  logger.logAttrVal("carac",text);
  logger.logValColor("size :"+text.length);

  round = Math.ceil(text.length / 499);


  // we have to split the description into portions of 500 char in order to fit in the table
  var dep = 0
  for (var i = 0; i < round-1; i++) {

    var portion = text.substring(dep,(dep+499));

    data.caracteristique.push(portion);
    dep=dep+499;
  }

  var portion = text.substring(dep,(text.length));
  logger.logAttrVal("Portion "+i+":",portion);

  logger.logAttrVal('DATA', data)
  return
  process.send({
    requestID : ReqObject.requestID,
    data			: data
  })

}



function update(param){
    var obj = {};
    obj.hostname = "www.mr-bricolage.fr";
    obj.filename   = param.filename;

  	obj.Enseigne 	 = param.Enseigne;
  	obj.MagId  		 = param.MagasinId; // dont set obj.MagasinId at this level
  	obj.lookup		 = param.url;
  	obj.requestID	 = param.requestID;
    engine.BindRequest(obj.lookup	, {}, {}, getDetailArticles, obj); //https://magasin.mr-bricolage.fr/search?query=&lf_storeLocatorWidget_submit=
    // DEV AND DEBUG
    //engine.BindRequest("http://www.mr-bricolage.fr/amenagement-exterieur-1/animalerie/abri-pour-animaux.html?magasin=Balaruc-Le-Vieux", {}, {}, ProdList, obj);
}

function debug(param) {
	var obj = {};
	obj.hostname = "www.mr-bricolage.fr";
	obj.filename = param.filename;
	obj.Enseigne = 'MrBricolage';
	obj.MagId = '2'; // dont set obj.MagasinId at this level
	//obj.lookup = 'http://www.mr-bricolage.fr/chauffage-traitement-de-l-air/poele-1/poeles-a-bois/poele-bois-chambord-10-kw-rouge-invicta.html?magasin=epernay';
	obj.lookup = 'http://www.mr-bricolage.fr/outillage-jardin/pulverisation/pulverisateur-a-pression-entretenue/pulverisateur-einhell.html?magasin=epernay'; // promo
	obj.requestID = 0;

	engine.BindRequest(obj.lookup, {}, {}, getDetailArticles, obj);
}

module.exports = {
	update: update,
	debug : debug
};
