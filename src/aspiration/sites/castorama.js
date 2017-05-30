var Engine = require("../engine/engine"),
  cheerio = require('cheerio'),
  Entities = require('html-entities').XmlEntities;

function Castorama(use_proxy){
  Engine.call(this);
  this.use_proxy = use_proxy;
};

Castorama.prototype = Object.create(Engine.prototype);

Castorama.prototype.call = function (params) {
  this.request(params);
};

Castorama.prototype.constructor = Castorama;

Castorama.prototype.decode = function (html, req, response) {

  if (html === ""){
    logger.error("Not any html");
    var output = {
      requestID  :  req.requestID,
      error      :	"Page non disponible",
      data       :  undefined
    };
    return this.emit('fatal_error', output, req);
  }
  var $ = cheerio.load(html);

  logger.debug('vumMsg',$('div#vumMsg').text())
  if ($('div#vumMsg').text().length) {
    logger.warn('Produit non disponible','Produit non disponible')
    var output = {
      requestID  :  req.requestID,
      error      :	"produit non disponible",
      data       :  undefined
    };

    return this.emit('fata_error', output, req);
  }

  var product = $("div.productContent");

  //recuperation des donnees produit
  if (req.skuDone !== true) {
    var len = $("select#multiskuPage > option:not(.selected)").each(function() {
      var sku = $(this).attr("value");
      // Ne pas prendre la fiche "Choisissez"
      if (sku && (sku.length > 0) && sku.indexOf('Choisissez')< 0 ){
        var clone = _.extends(obj);
        clone.skuDone = true;
        clone.url = clone.lasturl + "&skuId=" + sku;
        //console.log(url);
        //process.exit(0);
        // engine.AddRequest(url, {}, {}, Castorama.Castorama_GetDetailsArticle, clone);
        this.request(clone);
      }
    }).length;
    if (len > 0) {
      /* we add all sku request the default one is not intresting */
      return;
    }

  } else {
    logger.debug("succeed from");
    logger.info(req.lasturl);
  }

  var data = {};

  var idToTreat = product.find("span.refNum").text();
  var p = /([0-9]+)/;
  var match = p.exec(idToTreat);
  if (match) {
    data.idProduit = match[1];
  }

  data.marque = product.find("div.productLabel img").attr("title");

  data.categories = []
   $('div[class="breadcrumbs greenPage"] div a').each(function (i, elm){
      if(i>0){
        logger.logAttrVal('text',$(this).text())
        data.categories.push($(this).text())
      }

  })

  data.libelles = [];
  data.libelles.push(product.find("h1").text().replace(/\n/g, " ").replace(/\r/g, " "));

  var priceBlock = $("div.productPrix.productDetailsPriceBlock");

  // simple case price
  data.prix = $(priceBlock).find("div.priceContent > div.price").text().trim();

  // promo sans oldprice mettre la mention PROMOTION 29/08/2016
  if($('.productImage .prodHighlightContent') && $('.productImage .prodHighlightContent').length > 0){
    var promo = $('.productImage .prodHighlightContent').text().trim()
    if(promo.indexOf('PROMOTION') < 0 && !(promo == 'Nouveauté')){
      data.promoDirecte = 'PROMOTION ' + promo
    }else{
      if(!(promo == 'Nouveauté'))
      data.promoDirecte = promo
    }
  }

  // simple promo
  if ($(priceBlock).find("div.priceContent > .oldprice").length > 0) {

    data.prixUnite = $(priceBlock).find(".priceContent > span.newprice").text().trim();
    data.promo = 1;
    data.prix = $(priceBlock).find(".priceContent > span.newprice").text().trim();
    data.ancienPrix = $(priceBlock).find(".priceContent > span.oldprice").text().trim();
    // promo sans oldprice mettre la mention PROMOTION 29/08/2016
    if($('.productImage .prodHighlightContent') && $('.productImage .prodHighlightContent').length > 0){
      data.promoDirecte = $('.productImage .prodHighlightContent').text().trim()
    }
    if(data.promoDirecte =='PROMOTION'){
      data.promoDirecte = data.promoDirecte +' '+ $(priceBlock).find(".discount").text();
    } else {
      data.promoDirecte = 'PROMOTION ' + $(priceBlock).find(".discount").text();
    }
  }
  if($(priceBlock).find(".discount") && $(priceBlock).find(".discount").length > 0){}

  var ttt = $(priceBlock).find("span.cardAddMess").text();
  var infoUnite = "";
  var patternConditionnement = /vendu en conditionnement de.(\d+(,\d{1,2})?)/;
  match = patternConditionnement.exec(ttt);
  if (match) {
    data.conditionnement = match[1];
    infoUnite = '/ Lot';
  }

  var patternPrix = /soit.(\d+(,\d{1,2})?)/;
  match = patternPrix.exec(ttt);
  if (match) {
    data.prixUnite = data.prix;
    data.prix = match[1] + infoUnite;
  }

  var entities = new Entities();
  var tttHTML = $(priceBlock).find(".additionalPrice").html();
  if (tttHTML) {
    ttt = entities.decode(tttHTML).replace(/\n/g, "").replace(/\r/g, "").trim();

    patternPrix = /soit. *(\d+(,\d{1,2})?) �\/l/;
    match = patternPrix.exec(ttt);
    if (match) {
      data.prixUnite = match[1];
    }
  }

  if (!data.prixUnite || data.prixUnite === "") {
    if ($(priceBlock).find(".priceContent > div.additionalPrice").text().trim().indexOf("recyclage") === -1)
      data.prixUnite = $(priceBlock).find(".priceContent > div.additionalPrice").text().trim();
  }


  //recuperation du lien vers l'image du produit
  data.srcImage = $("div.productImage img").attr('src');
  //lien produit a recuperer
  data.lienProduit = req.produitURL;
  data.isPremierPrix = (product.find("img[src='/images/brands/L_PREMIER_PRIX.jpg']").length > 0) ? 1 : 0;

  data.timestamp = +(new Date());
  data.enseigne = req['Enseigne'];
  data.magasin = req['Magasin'];
  data.magasinId = req['MagasinId'];
  // data.idxProduit = engine.getidxProduit(req.tree);
  data.ean = undefined;
  data.dispo = $("input.buttonCart").length ? 1 : 0;

  // Extraction des caractéristiques
  if (req.MagasinId === '0'){
    var Caracteristiques = $("div#tabs_pd_pagetechnicTab div.prodDescMarker").text().trim();
    data.caracteristique = outils.prettify_me(Caracteristiques).split(";");
  }
  //process.exit(0);
  //logger.logAttrVal('DATA', data)
  //engine.export_products(data, obj);


  var output = {
    requestID  :  req.requestID,
    data       :  data
  };

  this.emit('done', output);
};

module.exports = Castorama
