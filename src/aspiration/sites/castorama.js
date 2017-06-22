var Engine = require('../engine/engine'),
  logger = require('log4js').getLogger('Castorama'),
  async = require('async'),
  tree = require('pretty-tree'),
  Entities = require('html-entities').XmlEntities,
  cheerio = require('cheerio'),
  _ = require('underscore');

function Castorama(use_proxy){
  this.name = "Castorama";
  this.use_proxy = use_proxy;
  Engine.call(this);
  this.on("stores", this.parseStores);
  this.on("home", this.home);
  this.on("store-detail", this.aspireOnStore)
};

Castorama.prototype = Object.create(Engine.prototype);

Castorama.prototype.call = function (params) {
  if (params.stores){
    this.stores = params.stores;
  }

  logger.info("Parameters call engine", params);

  this.request({
    url: "http://www.castorama.fr",
    origin: params
  }, 'home');
};

Castorama.prototype.constructor = Castorama;

Castorama.prototype.home = function (html, req) {
  logger.info("Home view: ", this.stores !== undefined && this.stores.length > 0);
  if (req.origin) {
    req = req.origin
  }
  if ( this.stores !== undefined && this.stores.length > 0 ) {
    this.aspireOnStore(req);
  } else {
    this.getStores(req);
  }
};

Castorama.prototype.getStores = function(params){
  this.request({
    url: "magasins.castorama.fr/point_of_sales.json",
    origin: params
  },
  "stores");
};

Castorama.prototype.aspireOnStore = function(html, req, reponse){
  var that = this;
  var $ = cheerio.load(html);

  var url = $("div.mem-store-button a").attr("href");
  var pattern = /[0-9]+/;
  var codeMagasin = pattern.exec(url) ? pattern.exec(url)[0] : "";
  if (req.url.indexOf('778078-castorama-les-ulis') !== -1){
    codeMagasin = 2375;
  }

  if(codeMagasin) {
    var magasin = _.filter(this.stores, function(store){
      return req.url.indexOf(store.url) !== -1;
    })[0];
    console.log(tree(magasin));
    magasin.idTech = codeMagasin
    logger.debug('=====> Traitement mag ' + codeMagasin + ' - ' + magasin.name);
    logger.debug('=====> url = ' + magasin.url);
    logger.debug("start magasin", magasin.id);

    var param = _.clone(req.origin);
    param.magasin = magasin;
    param.stores = this.stores;
    param.cookies = {
      's_cdao': codeMagasin
    };
    logger.debug("Castorama_MagasinList", codeMagasin);
    that.request(param);
  } else {
    that.emit("fatal_error", {message: `magasin ${req.url} not found`, requestID: req.requestID}, req.origin);
  }
};

Castorama.prototype.parseStores = function (json, req, response) {
  var that = this;
  logger.info(response.cookies);
  // console.log(html);
	//var $ = cheerio.load(html);
  that.stores = [];
	logger.info("Rentré dans Castorama_MagasinList");

  logger.debug("Level", "ParseMagasins");

  //var MagToDo = outils.FileToArray(LINK_MAG_FILE)

  //logger.logAttrVal("####","####");
  //console.log(MagToDo);
  //logger.logAttrVal("####","####");

  var listeMagasins = json["points_of_sale"]["France"];

  for (var elm in listeMagasins) {
    this.stores.push({
      id: elm,
      name: listeMagasins[elm].name,
      url: listeMagasins[elm].url
    });
  }

  logger.debug("Castorama_MagasinList", this.stores);
  this.aspireStoreDetails(req);
};

Castorama.prototype.aspireStoreDetails = function (req){
  var that = this;
  async.each(this.stores, function(store){
    that.request({
      url: "magasins.castorama.fr/" + store.url,
      origin: req.origin
    },
    'store-detail');
  }, function(err){
    if (err){
      return console.error("error", err);
    }
    // this.aspireOnStore();
  });
}


Castorama.prototype.decode = function (html, req) {
  console.log("Decoding query: " + req.url);

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
  data.enseigne = req.Enseigne;
  /*data.magasin = req['Magasin'];
  data.magasinId = req['MagasinId'];*/
  data.magasin = req.magasin;
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
    data       :  data,
    stores: this.stores
  };

  this.emit('product', output);
};

module.exports = Castorama
