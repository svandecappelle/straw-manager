var Engine = require('../engine/engine'),
  htmlToText = require('html-to-text'),
  cheerio = require('cheerio'),
  log4js = require("log4js"),
  logger = log4js.getLogger('BricoDepot'),
  _ = require('underscore');

function Bricodepot(use_proxy){
  this.name = "Bricodepot";
  this.use_proxy = use_proxy;
  Engine.call(this);
  this.on("stores", this.parseStores);
  this.on("home", this.home);

};

Bricodepot.prototype = Object.create(Engine.prototype);

Bricodepot.prototype.call = function (params) {
  if (params.stores){
    this.stores = params.stores;
  }
  logger.info("Parameters call engine", params);

  this.request({
    url: "http://www.bricodepot.fr",
    origin: params
  }, 'home');
};

Bricodepot.prototype.constructor = Bricodepot;

Bricodepot.prototype.home = function (html, req) {
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

Bricodepot.prototype.getStores = function(params){
  this.request({
    url: "http://www.bricodepot.fr",
    origin: params
  },
  "stores");
};

Bricodepot.prototype.aspireOnStore = function(req){
  var that = this;
  req.stores = this.stores;
  _.each(this.stores, function(magasin){
    var param = _.clone(req);
    param.magasin = magasin;
    param.cookies = {
      'smile_retailershop_id': magasin.id
    };
    req.origin = req.url;
    param.origin = req.url;
    param.url = req.url.replace('/saint-etienne/', magasin.name);
    logger.debug("Bricodepot_MagasinList", magasin.name);
    that.request(param);
  });
};

Bricodepot.prototype.parseStores = function (html, req, response) {
	logger.info("Rentré dans Bricodepot_MagasinList");
  var that = this;
  that.stores = [];

  var $ = cheerio.load(html);
  $("#myStoreM").first().find("option").each(function(idx) {
    var MagasinName = $(this).data('url').replace(/\n/g,' ').replace(/\t/g,'').trim();
    var url = $(this).attr('data-url');
    var MagasinId = $(this).attr('value');

    if (MagasinId.length < 1) {
      console.log("NOT A MAG");
      return;
    }

    logger.trace(`Entrer dans le magasin ${MagasinId}`);
    //ReqObject.xlbSetJar = cookie;
    logger.debug(url, MagasinId);
    that.stores.push({
      id: MagasinId,
      name: MagasinName
    });
  });
  req.origin.stores = this.stores;
  logger.debug("Bricodepot_MagasinList", this.stores);
  this.aspireOnStore(req.origin);
};

Bricodepot.prototype.decode = function (html, req) {
  var $ = cheerio.load(html);
  var data = {};

  if (($('span.inStock span').text().trim() == "0 pièce")||($('span.inStock span').length == 0) ){

    var output = {
      requestID  :  req.requestID,
      error      :	"produit non disponible",
      data       :  {},
      req        : req
    };

    return this.emit('not_found', output, { 'message': output.error });
  }

  var tampon = '';
  var NumLigne = 1;

  var ficheNumberOfProducts = $(".ref_val_devis.web").length;
  logger.debug('URL Fiche', req.origin)
  logger.debug('ficheNumberOfProducts',ficheNumberOfProducts);

  $("table.criteria > tr").each(function() {

    //var produit = engine.clone(obj.exportData);
    var tds = $(this).children("td");
    var indexId = 0
    data.promo = 0;
    data.timestamp = +(new Date());
    data.enseigne = req['Enseigne'];
    data.magasin = req.magasin;
    data.url = req.url;
    data.dispo = data.prix ? 1 : 0;

    data.srcImage = $("#productZoom img").attr('src')  // 23/01/2017 udpdate //// produit.srcImage = $('[itemprop="image"]').attr('src') // update 24/06/2016
    if($("table.criteria").html().indexOf("/docroot/images/tempImg/exclu-web-small.png")>0){
      indexId++
    }
    data.idProduit = $(tds[indexId]).text().split('Réf:')[1].trim(); // Selector Update 02/07/2015
    data.libelles = []
    data.libelles.push($('h1.prodTitle').text().trim())
    logger.debug('mag :'+data.magasinId+' id produit',data.idProduit);
    data.categories = []
    $('div[class="breadcrumbs web"] a').each(function (p,elm) {
      if(p>0) {
        data.categories.push($(this).text())
      }
    });
    var temporaryArray = data.libelles;

    for (var k = 1; k < tds.length - 2; k++) {
      if (tds[k].children[0]) {
        if (!$(tds[k]).hasClass("redlight"))
          // produit.libelles.push($(tds[k]).text().replace(/\t/g, "").replace(/\n/g,"").replace(/\r/g, "").trim());
          temporaryArray.push($(tds[k]).text().replace(/\t/g, "").replace(/\n/g,"").replace(/\r/g, "").trim());

      }
    }
    var typeList = temporaryArray.length;

    logger.debug('####################[ TABLE BRUTE ]#####################');
    logger.debug(temporaryArray)
    logger.debug("LIST STYLE "+typeList);
    logger.debug('####################[ TABLE NETTE ]#####################');

    data.libelles = temporaryArray.slice(0, typeList-2);

    // LIST STYLE AND NUMBER OF PRODUCT PER PAGE
    // if there is many prod and the list style is 3 ==> we have to make [0] and [1] else we keep the default
    // if the list style is 2 we take [0] ==> override default (wich give an empty libelle)
    if(typeList < 3)
      data.libelles = temporaryArray.slice(0, typeList-1);
    else if (( typeList == 3) && (ficheNumberOfProducts > 1)) {
      data.libelles = temporaryArray.slice(0, typeList-1);
    }


    logger.debug(data.libelles);
    logger.debug("table length "+data.libelles.length);

    // ==============================================

    if (data.libelles[1]){
      // On regarde si le libellé du produit (dans le tableau) n'est pas présent dans le libellé général du produit
      tampon = data.libelles[1].latinise();
      tampon = tampon.toUpperCase();
      // S'il est présent, on va le supprimer car on va ajouter au libelle général les libellés des différentes lignes du tableau
      if (data.libelles[0].indexOf(tampon) != -1){
        data.libelles[0] = data.libelles[0].replace(tampon, "");
        logger.debug('INFO', "Lib général est présent, on va le supprimer car on va ajouter les libellés des différentes lignes du tableau");
        logger.debug("L[0] : "+data.libelles[0]);
      }
    }
    if (data.libelles[1]) {
      // On ajoute le libellé du tableau au libellé principal
      data.libelles[0] += ' - ' + data.libelles[1];
      logger.debug('INFO', "On ajoute le libellé du tableau au libellé principal");
      logger.debug("L[0] : "+data.libelles[0])


      // On supprime le 2ème libellé qui est devenu inutile
      data.libelles[1] = "";
      logger.debug('INFO', "On supprime le 2ème libellé qui est devenu inutile");
    }

    // Gestion des prix
    /*
      price.children("small").remove();
    */
    var price = $(this).find(".productTablePriceCell table").eq(0).find('td').text().trim();
    logger.debug('PRIX BRUT',price );

    // la zone prix contient les prix TTC et les prix HT
    // S'il y a 2 prix TTC, on considère que le 1er est le prix unitaire et le 2ème le prix de l'article
    // S'il n'y a qu'un seul prix, on considère qu'il n'y a que le prix de l'article
    data.prix = price;
    tampon = data.prix.replaceAll('\r', '');
    tampon = tampon.replaceAll('\t', '', tampon);
    if (tampon.trim().indexOf('soit') != -1){
      // On a 2 prix
      tampon = tampon.replaceAll('\r', '');
      tampon = tampon.replaceAll('\n', '');
      tampon = tampon.replaceAll('\t', '');

      logger.debug('DETECTED','UNITY PRICES');
      data.prixUnite = tampon.trim().split('soit')[0];
      data.prix = tampon.trim().split('soit')[1];
    } else{
      //produit.prix = tampon.trim().split('\n')[0];
      data.prix = htmlToText.fromString($(this).find(".productTablePriceCell table").eq(0).find('td'), { wordwrap: false });
    }


    var oldprice = $(this).find(".productTablePriceCell table").eq(1).find('.oldPrice.clearfix');
    if (oldprice.length > 0){
      data.ancienPrix = oldprice.text().trim();
      data.promo = 1;
    }

    // On récupère les caractéristique sur la première ligne du tableau
    if (NumLigne === 1){
      //console.log($("div.prodDescr div.prodInfo").text().trim());
      data.caracteristique = [];
      tampon = $("div.prodDescr div.prodInfo").text().trim();
      tampon = tampon.replaceAll('\r', '');
      tampon = tampon.replaceAll('\n', '');
      tampon = tampon.replaceAll('\t', '');
      if (tampon.length > 0) data.caracteristique.push(tampon);
    }

    NumLigne ++;
    logger.debug("Product Export from page :"+req.origin);
    logger.debug('# FICHE ##',"###")
    logger.debug(data);
    logger.debug('# FICHE ##',"###")
    //engine.export_products(produit, obj);
  });

  if (_.isEmpty(data)){
    logger.warn("Empty data on product page: ", req.url);
    var output = {
      requestID  :  req.requestID,
      error      :	"produit non disponible",
      data       :  {},
      req        : req
    };
    return this.emit('not_found', output, { 'message': output.error });
  }

	var output = {
		requestID : req.requestID,
    stores: this.stores,
		data: data
	};
  this.emit('product', output, req);
};

module.exports = Bricodepot
