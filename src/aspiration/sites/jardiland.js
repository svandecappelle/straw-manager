//
// jardiland.js for OptiMix
// CHELBI Ahmed
//

var cheerio = require('cheerio');
var dateFormat = require('dateformat');
var outils = require("../engine/outils");
var name = "Jardiland";
var htmlToText = require('html-to-text');
var xlblogger = require('xlblogger');
var logger = new xlblogger("jardiland");


function Fiche(html, obj){
  var $ = cheerio.load(html);
  newObj = engine.clone(obj);
 	data = {};

  data.categories= []
  $('.breadcrumbs [class*="cate"]').each(function () {
    data.categories.push($(this).find('a').text())
  })

  data.timestamp = +(new Date());
  data.enseigne = obj['Enseigne'];
  data.magasin = obj['Magasin'];
  data.magasinId = obj['MagasinId'];
  data.libelles = [];

    var lib = $('#image-main').attr('alt')
    var lib2 = $('[name="keywords"]').attr('content')
    if (lib !== 'image') {
      data.libelles.push(lib);
    }else {
      data.libelles.push(lib2);
    }

  data.prix = $('.product-essential .price-info .regular-price').text().trim()
  data.ancienPrix = $('.product-essential .old-price .price').text().trim()

  if (data.ancienPrix && data.ancienPrix.length > 0) {
  data.prix=  $('.product-essential .special-price .price').text().trim()
  data.promo = 1
  data.promoDirecte = $('.product-essential .promo-percent').text().trim();
  }


  data.prixUnite = $('#contenance-title').text().trim()
  data.srcImage = $('#image-main').attr('src')
  var preProdId = $('[name="product"]').attr('value')
  data.idProduit = preProdId+'-'+preProdId

  data.marque = $('[itemprop="name"] span').text()

  data.ean = undefined;
  data.dispo = ($('.product_avaliable').length > 0) ? 0 : 1;

  try {
     contentJson = html.split('Product.Config(')[1].split(');')[0]
     parsedData = JSON.parse(contentJson)
    logger.logTree('JSON','PARSED', data.magasin+"("+data.magasinId+")")
  } catch (e) {
    parsedData = undefined;
    logger.logValColor('no attributes')
  }

  if (parsedData && parsedData.attributes) {
  var copyData = engine.clone(data)

    var attributesJSON = parsedData.attributes
    // manage products
    Object.keys(parsedData.childProducts).forEach(function (idProduit) {
       var specificData = engine.clone(copyData)
       var specificObj = engine.clone(newObj)
      var updateLibelle = ""
      Object.keys(attributesJSON).forEach(function (idAttribute) {
          attributesJSON[idAttribute].options.forEach(function (elm, i) {
          var listProdAttached  = attributesJSON[idAttribute].options[i].products
          if (listProdAttached.indexOf(idProduit) >= 0) {
            updateLibelle  = updateLibelle+" "+attributesJSON[idAttribute].label+": "+attributesJSON[idAttribute].options[i].label
          }
        });
      });

      var price = parsedData.childProducts[idProduit].price
      var finalPrice = parsedData.childProducts[idProduit].finalPrice
      var prixUnite = parsedData.childProducts[idProduit].contenanceLabel

      try {
        prixUnite = prixUnite.replace('<span class="price">','')
        prixUnite = prixUnite.replace('</span>','')
      } catch (e) {

      }

      try {
        specificData.libelles.push(updateLibelle.trim());
      } catch (e) {
        logger.logAttrVal('ERROR', e)
      }

      specificData.idProduit = preProdId+'-'+idProduit
      specificData.prix = finalPrice
      specificData.ancienPrix = undefined
      specificData.prixUnite = prixUnite

      if (price != finalPrice) {
        specificData.ancienPrix =  price
      }

      specificData.promo = specificData.ancienPrix ? 1 : 0;
      specificData.promoDirecte = specificData.promo;


      var indexPicture = $('#more-'+idProduit+' a').attr('data-image-index')
      if (indexPicture) {
        //  logger.logTree(indexPicture,'src',srcImage)
        var srcImage = $('#image-'+indexPicture).attr('src')
        specificData.srcImage = srcImage
      }

      logger.logAttrVal("DATA", "BEGIN")
      console.log(specificData);
      logger.logAttrVal("DATA", "END")
      engine.export_products(specificData, specificObj);
    });
  }else {
    logger.logAttrVal("DATA", "BEGIN")
    console.log(data);
    logger.logAttrVal("DATA", "END")
    engine.export_products(data, newObj);
  }
}




function List(html, obj) {
  var $ = cheerio.load(html);

  $('.products-grid .item').each(function(){
    var prodName = $(this).find('a').attr('title')
    var prodURL = $(this).find('a').attr('href')
    var clone = engine.clone(obj);
    logger.logAttrVal(prodName,prodURL)
    engine.BindRequest(prodURL, {}, {}, Fiche, clone);
  });

  /* [$%{#}%$] Manage pagination [$%{#}%$] */

  if ($('.next.i-next') && $('.next.i-next').length > 0) {
    var href = $('.next.i-next').attr('href')
    logger.logTree('Pagination','Next Page', href)
    nextP = engine.clone(obj)
    engine.BindRequest(href, {}, {}, List, nextP);
  }else {
    logger.logValColor('No pagination')
  }

}


//Gets categories
function Navigation2(html, obj){
  var $ = cheerio.load(html);

  var nomDuMag = $('[id*="store-"] h2').text()
  nomDuMag = (nomDuMag.length > 0)? nomDuMag : 'Magasin National'
  logger.logAttrVal('Mag', nomDuMag)

  $('.intern .intern-content a').each(function(){

    var clone = engine.clone(obj);
    var href = $(this).attr('href')
    var nbProduit = $(this).find('span b').text()
    logger.logAttrVal('Niveau 1 ('+nbProduit+')', href)
    engine.BindRequest(href, {}, {}, List, clone);

  });
}

function Navigation(html, obj){
  var $ = cheerio.load(html);

  var nomDuMag = $('[id*="store-"] h2').text()
  nomDuMag = (nomDuMag.length > 0)? nomDuMag : 'Magasin National'
  logger.logAttrVal('Mag', nomDuMag)

  $(".nav-primary > .level0").each(function(){
    var clone = engine.clone(obj);
    var n1 = $(this).find('> a').text().trim()
    logger.logValColor('Niveau 1 ('+n1+')')
    $(this).find('.level0 > .menu-column > ul > .level1').each(function(){
      var clone2 = engine.clone(clone);
      var n2 = $(this).find(' > a').text().trim()
      logger.logAttrVal('Niveau 2 '+n1, n2)
      //logger.logAttrVal('niveau 3 ?', $(this).children().length)
      if ($(this).children().length < 2) {
        clone3 = engine.clone(clone2)
        clone3.tree =[]
        clone3.tree.push(n1)
        clone3.tree.push(n2)
        logger.logAttrVal('Pas de niveau 3', n2)
        var href = $(this).find(' > a').attr('href')
        if (n2) {
          logger.logTree('Nomenclature', clone3.tree, href)
          engine.BindRequest(href, {}, {}, List, clone3);
        }

      }else {
        $(this).find('> .level1 > .level2').each(function(){
          clone4 = engine.clone(clone2)
          clone4.tree =[]
          var n3 = $(this).find(' > a').text().trim()
          var href = $(this).find(' > a').attr('href')
          clone4.tree.push(n1)
          clone4.tree.push(n2)
          clone4.tree.push(n3)
          if (n2) {
            logger.logTree('Nomenclature', clone4.tree, href)
            engine.BindRequest(href, {}, {}, List, clone4);
          }

        });
      }
    });
  });
}




function Init(html, obj){
  var $ = cheerio.load(html);
  var clone = engine.clone(obj);
  if (process.argv[3] && (process.argv[3].toLowerCase() == 'animalerie' )) {
    logger.logValColor('Animalerie !')
    engine.BindRequest("/animaux.html", {}, {}, Navigation2, clone);
  }else {
    engine.BindRequest("/", {}, {}, Navigation, clone);
  }


    /* DEV */
    //engine.BindRequest("/animaux/rongeurs-et-petits-mammiferes.html", {}, {}, List, clone);
//  engine.BindRequest("http://www.jardiland.com/animaux/rongeurs-et-petits-mammiferes/hygiene-et-soins/autres-produits-d-hygiene/3619-vitamine-pour-rongeur-vitavit.html", {}, {}, Fiche, clone);
//  engine.BindRequest("https://www.jardiland.com/animaux/chien/soins-antiparasitaires/insecticide/32262-collier-anti-puces-pour-grand-chien.html", {}, {}, Fiche, clone); // color selection

 //engine.BindRequest("https://www.jardiland.com/animaux/chien/alimentation-et-friandises/os-a-macher/51535-8in1-selection-6-varietes-xs-x15-1.html", {}, {}, Fiche, clone);   //normal fiche
//engine.BindRequest("https://www.jardiland.com/animaux/chien/hygiene-et-soins/soin-de-toilettage/32160-brosse-foolee.html", {}, {}, Fiche, clone); // double attributes
// engine.BindRequest("https://www.jardiland.com/animaux/basse-cour/aliments/aliment-pour-volaille/50859-aliment-complementaire-bio-poule-pondeuse.html", {}, {}, Fiche, clone);// double attribute + prix unite
// engine.BindRequest("https://www.jardiland.com/plantes/plantes-pour-massifs-balcons-pots-et-jardinieres/plantes-a-fleurs-saisonnieres/bruyere/36135-bruyere-d-hiver.html", {}, {}, Fiche, clone);// // triple
//engine.BindRequest("https://www.jardiland.com/animaux/oiseau-de-la-nature/alimentation/32319-melange-super-premium.html", {}, {}, Fiche, clone);// One
//engine.BindRequest("https://www.jardiland.com/animaux/basse-cour/aliments/aliment-pour-volaille/50829-aliment-complet-pour-poussin.html", {}, {}, Fiche, clone); //promo
//engine.BindRequest("https://www.jardiland.com/jardinage/terreau/terreau-pour-jardin-et-potager/autres-terreaux-specifiques/2848-terreau-carre-potager.html", {}, {}, Fiche, clone); // notpromo

//engine.BindRequest("https://www.jardiland.com/amenagement-du-jardin/pots-bacs-jardinieres-et-supports/en-plastique/31548-bac-en-plastique-romeo.html", {}, {}, Fiche, clone); // multi pictures


}


function loadMags(html, obj){

  try {
      contentJson = html.split('jardilandStores =')[1].split(';')[0]
      parsedData = JSON.parse(contentJson)
      logger.logAttrVal('JSON','PARSED')
    } catch (e) {
      logger.logAttrVal('ERROR PARSING JSON',e)
    }

    var count = 0
    Object.keys(parsedData).forEach(function (idMag) {
      if (parsedData[idMag].has_stock > 0){
       count ++
       var clone = engine.clone(obj);
       clone.Magasin = parsedData[idMag].name
       clone.MagasinId = parsedData[idMag].id
       clone.urlMag = parsedData[idMag].url

       if (clone.MagasinId  && engine.shouldBeDone(clone.MagasinId)) {
         logger.logTree(clone.Magasin,clone.MagasinId,clone.urlMag)
         var cookie = 'jardistore='+clone.MagasinId
         clone.xlbSetJar = cookie
         engine.BindRequest(clone.urlMag, {}, {}, Init, clone);
       }
      }
    });
    //logger.logTree('Nb mags (hasStock)',Object.keys(parsedData).length,'('+count+')')
}


function update(param){
    var obj = {};
    obj.hostname = "www.jardiland.com";
    obj.https = true;
    obj.public_ip = true;
    obj.Enseigne = name;
    obj.tree = [];
    engine.BindRequest("/", {}, {}, loadMags, obj);
    // DEV AND DEBUG
    //engine.BindRequest("https://www.jardiland.com/plantes/bulbes-et-pommes-de-terre/bulbes-a-fleurs/autres-bulbes-a-fleurs/56582-perce-neige.html", {}, {}, Fiche, obj);
}

module.exports = {
    update : update
};
