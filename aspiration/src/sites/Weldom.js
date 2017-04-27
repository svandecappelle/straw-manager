var cheerio = require('cheerio');
var dateFormat = require('dateformat');
var fs = require("fs");
var htmlToText = require('html-to-text');
var outils = require("../engine/outils");
var xlblogger = require('xlblogger');
var logger = new xlblogger("Weldom");
var name = "Weldom";

function ficheProduit(html, obj){
  var $ = cheerio.load(html);

  ReqObject = engine.clone(obj)
  logger.logAttrVal('Dans Fiche', $('[itemprop="price"]').length )
  /* ------------------------------------------------------------------------ */
  // manage fail
  if ($('[itemprop="price"]').length <= 0) {
    console.log("Pas de Dispo");
    process.send({
      requestID  :  ReqObject.requestID,
      error      :	"produit non disponible",
      data       :  undefined
    })

    process.exit(1); // important !!
  }
  logger.logValColor('Prix existe !')
  /* ------------------------------------------------------------------------ */
  logger.logAttrVal('Magasin', $('.header-logo .logo').attr('href'))
  var data = {};
  data.enseigne = ReqObject['Enseigne'];
  data.magasin = 'WELDOM '+ $('.header-logo .logo').attr('href').split('https://www.weldom.fr/')[1].split('/')[0].toUpperCase()
  data.magasinId = ReqObject['MagasinId'];
  data.categories= [];


  $('.grid-full.breadcrumbs ul li').each(function (i) {
    if (i==0 || i== $('.grid-full.breadcrumbs ul li').length-1) {
      return
    }else {
      data.categories.push($(this).find('a').text().trim());
      console.log(data.categories +' '+i);

    }

  })

    data.lienProduit = ReqObject.lookup
    data.srcImage = $('#image-main').attr('src');
    data.libelles = []
    data.libelles.push($('.product-name [itemprop="name"]').text().trim())
    data.idProduit = $('[name="product"]').attr('value');
    if ($('.old-price').length > 0) {
      data.ancienPrix = $('.old-price [itemprop="price"]').text().trim();
      data.prix = $('.special-price [itemprop="price"]').text().trim();
      data.promo = 1;
    }else {
      data.prix = $('.regular-price [itemprop="price"]').text().trim();
    }
    try {
      data.marque = $('#image-main').attr('alt').split('.jpg')[0]
    } catch (e) {
      logger.logAttrVal('Pas de Marque dans la liste pour le produit n '+ data.idProduit,e)
    }
    /*           Promo          */                     // 20/02/2017


    var cip7 = data.srcImage.substring(data.srcImage.lastIndexOf('/')+1).split('.jpg')[0]
    if(isNaN(cip7) == true){
      logger.logAttrVal('Pas un idproduit2 !')
    }else {
      data.cip7 = cip7
    }

    data.dispo = ($('.add-to-cart-buttons').length > 0) ? 0 : 1;

    if (!data.cip7) {
      data.cip7 = $('#PopinDiv').attr('data-product')
    }

    //$('.details-pdf').parent().text()//$('.std').not('.bottom-links').text().trim();
    //logger.logAttrVal('caracteristiques ', caracteristiques)
    if(html.indexOf('prix_plancher') > 0 ){
      data.libelles.push('Prix Plancher')
      data.promo= 1
    }

    if (html.indexOf('prix_weldom') > 0) {
      data.libelles.push('Prix Weldom')
      data.promo = 1
    }
    if($('.is-unite').length > 0){
      data.prixUnite = $('.is-unite').text().trim()
    }

    if (data.promo){
      data.promoDirecte = $('.IM_percent').text().trim()
      
    }

    data.cip13 = $('.data').eq(1).text().trim()
    try {
      var ean = html.split('>code barre</th>')[1].split('</td>')[0]
      data.ean =ean.split('"data">')[1]
    } catch (e) {
        logger.logAttrVal('Problème EAN', e)
    }

    try {
      var caracteristiques = htmlToText.fromString($('.product-item .std').eq(0).text().trim()) //.split('class="std">')[1].split('<div class=')[0].trim()
      data.caracteristique = outils.prettify_me(caracteristiques).split(";");
    } catch (e) {
      logger.logAttrVal('Problème Carac', e)
    }
  /*
    logger.logAttrVal('DATA','BEGIN')
    console.log(data);
    logger.logAttrVal('DATA','END')
    */
  process.send({
		requestID : ReqObject.requestID,
		data			: data
	})

}




function Patch(html, obj){
  var $ = cheerio.load(html);
  clone = engine.clone(obj)
  engine.BindRequest(clone.lookup, {}, {}, ficheProduit, clone);

  // Dev and Debug
  //engine.BindRequest('http://www.weldom.fr/lavelanet/chauffage-air/cheminee-poele-fixe.html', {}, {}, prodList, clone); // List Prod
  //engine.BindRequest('http://www.weldom.fr/linselles/outillage/outillage-electroportatif/perforateur-filaire.html', {}, {}, prodList, clone); // pagination

}


function update(param){
    var obj = {};
    obj.https      = true;
  	obj.public_ip  = true;
    obj.hostname = "www.weldom.fr";
    obj.filename   = param.filename;
  	obj.Enseigne 	 = param.Enseigne;
  	obj.MagId  		 = param.MagasinId; // dont set obj.MagasinId at this level
  	obj.lookup		 = param.url;
  	obj.requestID	 = param.requestID;

  	console.log(param);
    engine.BindRequest("/", {}, {}, Patch, obj);

  }

function debug(param) {
	var obj = {};
	obj.https = true;
	obj.public_ip = true;
	obj.hostname = "www.weldom.fr";
	obj.filename = param.filename;
	obj.Enseigne = 'Weldom';
	obj.MagId = '239'; // dont set obj.MagasinId at this level
  //obj.lookup = 'https://www.weldom.fr/linselles/perceuse-sans-fil-percussion-18v-3-ah-lithium.html';
  obj.lookup = 'https://www.weldom.fr/linselles/pack-wc-suspendu-theia-nf.html';// EN promo
  //TEST indispo
	//obj.MagId = '231'; // dont set obj.MagasinId at this level // TEST indispo
	//obj.lookup = 'https://www.weldom.fr/prunelli/perceuse-sans-fil-percussion-18v-3-ah-lithium.html'; // TEST INDISPO
	obj.requestID = 0;

	engine.BindRequest('/', {}, {}, Patch, obj);
}


module.exports = {
	update: update,
	debug : debug
};
