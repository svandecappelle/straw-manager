var cheerio = require('cheerio');
var dateFormat = require('dateformat');
var _ = require("lodash");
var outils = require("../engine/outils");
var htmlToText = require('html-to-text');
var encodeURISafe = require('encodeuri-safe');
var xlblogger = require('xlblogger');
var logger = new xlblogger("MrBricolage");

var name = "MrBricolage";

/* MANAGE CONTACT */
require("date-format-lite");
var now = new Date();
var levelOne = now.format("W");
DIRECTORY = process.argv[2]
PATH = 'D:/Out_Aspiration_2/'+levelOne+'/Contact/'
FILENAME = name.concat('.csv')

var contactList = new xlblogger(DIRECTORY,PATH,FILENAME);
//var contact = new xlblogger(DIRECTORY,PATH);
/*   */


function getDetailArticles(html, obj){
  var $ = cheerio.load(html);
  newObj = engine.clone(obj);
  data = newObj.data;
  var img = $(".bloc-img-principal img").attr('src')
  var img2 = $("#fiche-btn-zoom-hover").attr('href')
  if (img) {
    data.srcImage = img
  }else if (img2) {
    data.srcImage = img2
  }

  var carac = $("#descriptionlongue").html()

    var text = htmlToText.fromString(carac, { wordwrap: false });
    //console.log(text);
    text = text.replace(/\n/g, " ").replace(/\r/g, " ").trim()
    //data.carac = $("#descriptionlongue").text().replace(/\n/g, " ").replace(/\r/g, " ").trim();
    logger.logAttrVal("carac",text);
    logger.logValColor("size :"+text.length);

    round = Math.ceil(text.length / 499);
    console.log(round);

    // we have to split the description into portions of 500 char in order to fit in the table
    var dep = 0
    for (var i = 0; i < round-1; i++) {
      console.log("from "+dep+" to "+(dep+499));
      var portion = text.substring(dep,(dep+499));
      logger.logAttrVal("Portion "+i+":",portion);
      data.caracteristique.push(portion);
      dep=dep+499;
    }
    console.log("from "+dep+" to "+text.length);
    var portion = text.substring(dep,(text.length));
    logger.logAttrVal("Portion "+i+":",portion);
    data.caracteristique.push(portion);


  engine.export_products(data, newObj);
}

function ProdList(html, obj){
  var $ = cheerio.load(html);

  $("ul.listerayon > li").each(function(){
  	var data = {};

  	data.promo = 0;
	  data.promoDiff = undefined;

	  if (! $(this).attr("id")) return;
    var ReqObject = engine.clone(obj);
	  data.idProduit = $(this).attr("id").split("-")[1];
	  data.lienProduit = $(this).find("a.link-img").attr("href");
    ReqObject.force_url_prod = data.lienProduit;
	  data.srcImage = $(this).find("img.product-principale").attr("data-original").replace(/\n/g, "").replace(/\r/g, "").trim();
	  data.prix = $(this).find("span.price").text().trim();
	  data.marque = $(this).find("a.marque").text().trim();
	  data.libelles = [$(this).find(".content-product > a.nom").text().trim()];
	  data.promo = 0;
	  data.promoDirecte = "0";
	  if ($(this).find("span.prixbare").length > 0){
      $(this).find("span.prixbare").find("span.label").remove();
      data.prix = $(this).find("p.price-fiche").text().replace(/\n/g, "").replace(/\r/g, "");
      data.ancienPrix = $(this).find("span.prixbare").text().replace(/\n/g, "").replace(/\r/g, "");
      data.promo = data.ancienPrix.length>0?1:0;
      data.promoDirecte = "1";
	  }
    data.caracteristique = [];
    var champ = "";
    var valeur = "";
    //console.log('on liste les caractéristique du produit ', data.idProduit);
    $(this).find("div.popup-product-content> aside.caracteristique table tr").each(function(){
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
    //console.log(data.libelles);
    //console.log('EAN', data.ean, 'IdProduit', data.idProduit);
//process.exit(0);
  /*  var isEAN = /[0-9]{13}/;
	  data.ean = $(this).find("div.popup-product-content > aside.caracteristique > table > tr:nth-child(2) > td:nth-child(2)").text().trim();
    if ((!data.ean) || (data.ean.length != 13) || (!isEAN.test(data.ean))){
      // L'ean n'est pas toujours positionné au même endroit, on regarde s'il n'est pas sur la première ligne
      data.ean = $(this).find("div.popup-product-content > aside.caracteristique > table > tr:nth-child(1) > td:nth-child(2)").text().trim();
      // Si nous n'avons toujours pas 13 caractère, on n'enregistre rien
      if ((!data.ean) || (data.ean.length != 13) || (!isEAN.test(data.ean))) data.ean = '';
    }
	  data.idProduit2 = $(this).find("div.popup-product-content > aside.caracteristique > table > tr:nth-child(1) > td:nth-child(2)").text().trim();*/
	  data.categories= obj.tree;
	  data.timestamp = +(new Date());
	  data.enseigne = obj['Enseigne'];
	  data.magasin = obj['Magasin'];
	  data.magasinId = obj['MagasinId'];
	  data.idxProduit = engine.getidxProduit(obj.tree);

    if (ReqObject['MagasinId'] == 469){ // Comme plus de prix sur le 0, desormais on ira sur les fiche avec le mag 469
      // Pour le magasin central, on va chercher des informations supplémentaires
      // dans un soucis de performance on ne le fais que sur ce magasin
      // on recopiera par sql les informations ensuite pour les autres magasins
      ReqObject.data = data;
      engine.AddRequest(data.lienProduit, {}, {}, getDetailArticles, ReqObject);

    } else{
      data.caracteristique = [];
      //logger.logAttrVal('DATA', data)
      engine.export_products(data, ReqObject);
    }

  });
}

/*  Recupération des coordonnées magasin               */
function getContact(html, obj){
  var $ = cheerio.load(html);
  contactObj = engine.clone(obj)
  var contactMag = []
  contactMag.push(contactObj.Enseigne);
  contactMag.push(contactObj.Magasin)
  contactMag.push(contactObj.MagasinId)
  var adresse = $(".mag-block .mag-adress").text().replace(/\t/g, '').replace(/\n/g,' ').trim()
  var codePostal = adresse.substring(adresse.lastIndexOf("\r") + 1).trim()
  codePostal = codePostal.substring(0,5).trim()
  //if ((/([0-9])/))
  adresseMag = adresse.replace(/\r/g, ' ')
  contactMag.push(adresseMag)
  contactMag.push(codePostal)
  var coordonnees = $("#mapMag .map-latlng .value").text().trim()
  var latitude = coordonnees.split(',')[0].trim()
  var longitude = coordonnees.split(',')[1].trim()
  contactMag.push(latitude)
  contactMag.push(longitude)
  logger.logAttrVal('Coordonnées ===>', contactMag)
  contact.output(contactMag.join(';'))
}

function nomenclature(html, obj){
    var $ = cheerio.load(html);
    // Pour les cooredonnées magasin
    if (process.argv[3] && (process.argv[3].toLowerCase() == 'contact' )) {
      var linkContact = $(".contenumagasin  .link-pagemag").attr('href')
      if( obj.MagasinId == '0'){
        return;
      }else{
        engine.BindRequest(linkContact, {}, {}, getContact, obj);
      }
    } else{

      $("ul#menu-principal > li").each(function(){
	       var n1 = $(this).children("h1").text().trim();

	         $(this).find(".menuderoulle > ul").each(function(){
	            var n2 = $(this).find("li.titre > h2").text().trim();
	             $(this).find("li.rayon > a").each(function(){
		              var n3 = $(this).text();
		              var link = $(this).attr("href");

		              var clone = engine.clone(obj);
		              clone.tree = [n1, n2, n3];
                  logger.logAttrVal('Nomenc ==>', n3 + ' /// ' + link )
		              engine.BindRequest(link, {}, {}, ProdList, clone);
	            });
	         });
      });
    }
}


function Patch(html, obj) {
  var $ = cheerio.load(html);
  logger.logAttrVal('Patch IN ', obj.MagasinId + ' === ' + obj.Magasin)
  clone = engine.clone(obj);
  engine.BindRequest(clone.urlMag, {}, {}, nomenclature, clone);

}

function magList(html, obj){
  var $ = cheerio.load(html);

  /*
  // On traite en premier le magasin national
  if (engine.shouldBeDone('0')) {
    var clone = engine.clone(obj);
    clone.MagasinId = '0';
    clone.Magasin	= 'Magasin national';
    engine.BindRequest('/', {}, {}, Patch, clone);
  }
  return;

  // On traite la liste des magasins
  $('.search-basic__data__results__items .search-basic__data__results__items__result').each(function () {
    ReqObject = engine.clone(obj);
    var link = $(this).find('.container .row .col-xs-12 a').attr('href')
    try {
      var idMag = link.split('/magasin_id/')[1].split('/')[0];
      var name	= $(this).find('.container .row .col-xs-12 .components-outlet-item-search-result-basic__link__details__link__name__span').text().trim();
    } catch (e) {
        logger.logAttrVal("Pas d'ID Mag", e)
    }

    if (link && idMag){
        contact = []
        logger.logTree('Magasin ', name, idMag)
        ReqObject.urlMag = link
        ReqObject.MagasinId = idMag;
        ReqObject.Magasin	= name;
        ReqObject.https = false;
        ReqObject.public_ip = false;
        contact.push(ReqObject.Magasin)
        contact.push(ReqObject.MagasinId)
        contact.push(ReqObject.urlMag)
        contactList.writeLine(contact.join(';'))
        //engine.BindRequest(link, {}, {}, Patch, ReqObject);

    }
  })

  // Pagination Magasin
  if(obj.pagi == 1){
    Page = engine.clone(obj)
    Page.Maxpaginate = $('.components-navigation-pagination-basic__pages__page a').last().attr('href')
    Page.Maxpaginate = Page.Maxpaginate.split('&page=')[1].split('&')[0]
    logger.logAttrVal('Nombre de pages: ', Page.Maxpaginate)
  }
  if (Page.pagi < Page.Maxpaginate ) {
    Page.pagi++;
    var next = 'https://magasin.mr-bricolage.fr/search?lf_storeLocatorWidget_submit=&page='+Page.pagi+'&query='
    engine.BindRequest(next, {}, {}, magList, Page);
  }*/

  listMag =engine.GetListEAN();
  for (var i = 0; i < listMag.length; i++) {
    ReqObject = engine.clone(obj)
    ReqObject.Magasin = listMag[i].split(';')[0]
    ReqObject.MagasinId = listMag[i].split(';')[1].split(';')[0]
    ReqObject.urlMag = listMag[i].split(';')[2]
    //ReqObject.urlMag = encodeURISafe.encodeURIComponent(ReqObject.urlMag);
    if (engine.shouldBeDone(ReqObject.MagasinId)) {
      if (ReqObject.MagasinId == '411') {
        ReqObject.urlMag = 'http://www.mr-bricolage.fr/?magasin=Gérardmer'
      }
      engine.BindRequest(ReqObject.urlMag, {}, {}, Patch, ReqObject);
    }
  }

}


function update(param){
    var obj = {};
    obj.hostname = "www.mr-bricolage.fr";
    obj.Enseigne = name;
  //  obj.https = true;
  //  obj.public_ip = true;
    obj.pagi = 1
    obj.Maxpaginate = 1
    engine.BindRequest("/", {}, {}, magList, obj); //https://magasin.mr-bricolage.fr/search?query=&lf_storeLocatorWidget_submit=
    // DEV AND DEBUG
    //engine.BindRequest("http://www.mr-bricolage.fr/amenagement-exterieur-1/animalerie/abri-pour-animaux.html?magasin=Balaruc-Le-Vieux", {}, {}, ProdList, obj);
}

module.exports = {
    update : update
};
