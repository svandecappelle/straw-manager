var Engine = require('../engine/engine'),
  async = require('async'),
  htmlToText = require('html-to-text'),
  cheerio = require('cheerio'),
  log4js = require("log4js"),
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
  this.logger.info("Parameters call engine", params);

  this.request({
    url: "http://www.bricodepot.fr",
    origin: params
  }, 'home');
};

Bricodepot.prototype.constructor = Bricodepot;

Bricodepot.prototype.home = function (html, req) {
  this.logger.debug("Home view: ", this.stores !== undefined && this.stores.length > 0);
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
  async.eachLimit(this.stores, this.config.parallel,function(magasin, next){
    var param = _.clone(req);
    param.magasin = magasin;
    param.cookies = {
      'smile_retailershop_id': magasin.id
    };
    req.origin = req.url;
    param.origin = req.url;
    var toReplace = param.url.split('http://www.bricodepot.fr/')[1].split('/')[0]
    param.url = req.url.replace("/".concat(toReplace).concat('/'), magasin.url.replace("http://www.bricodepot.fr", ""));
    that.logger.debug("Bricodepot_MagasinList", magasin.name);
    that.request(param, next);
  });
};

Bricodepot.prototype.parseStores = function (html, req, response) {
	this.logger.debug("Rentré dans Bricodepot_MagasinList");
  var that = this;
  that.stores = [];

  var $ = cheerio.load(html);
  $('.bd-DropDown-dropdownList li').each(function(idx) {
    var MagasinName = $(this).find('a').text().trim();
    var url = $(this).find('a').attr('href');
    var MagasinId = $(this).attr('data-value');

    if (MagasinId.length < 1) {
      console.log("NOT A MAG");
      return;
    }

    that.logger.trace(`Entrer dans le magasin ${MagasinId}`);
    //ReqObject.xlbSetJar = cookie;
    that.logger.debug(url, MagasinId);
    that.stores.push({
      id: MagasinId,
      name: MagasinName,
      url: url
    });
  });
  req.origin.stores = this.stores;
  this.logger.debug("Bricodepot_MagasinList", this.stores);
  this.aspireOnStore(req.origin);
};

Bricodepot.prototype.decode = function (html, req) {
  var $ = cheerio.load(html);
  var data = {};

  if (($('span.inStock span').text().trim() == "0 pièce")||($('.bd-ProductCard-stock-label.bd-ProductCard-stock-label--reappro').length > 0) ){

    var output = {
      requestID  :  req.requestID,
      error      :	"produit non disponible",
      data       :  {},
      req        : req
    };

    return this.emit('not_found', output, { 'message': output.error });
  }

  data.url = req.url;
  data.magasin = req.magasin;
  data.timestamp = new Date()
  data.enseigne = req['Enseigne'];
  //Id Produit temporaire
  data.idProduit = $('.bd-ProductCard-ref [itemprop="mpn"]').text().trim()
  data.libelles =[]
  data.libelles.push($('.bd-ProductCard-title').text().trim().split(' Ref.:')[0])
  data.caracteristique=[]
  var carac = $('.r-Grid.bd-ProductDetails-table .r-Grid-cell.r-all--1of1').html()
  var text = htmlToText.fromString(carac, { wordwrap: false });
  //console.log(text);
  text = text.replace(/\n/g, " ").replace(/\r/g, " ").trim()
  //data.carac = $("#descriptionlongue").text().replace(/\n/g, " ").replace(/\r/g, " ").trim();

  round = Math.ceil(text.length / 499);
  // we have to split the description into portions of 500 char in order to fit in the table
  var dep = 0
  for (var i = 0; i < round-1; i++) {
    console.log("from "+dep+" to "+(dep+499));
    var portion = text.substring(dep,(dep+499));
    data.caracteristique.push(portion);
    dep=dep+499;
  }
  data.caracteristique.push($('.r-Grid.bd-ProductDetails-table .r-Grid-cell.r-all--1of1').text().trim().replace(/\t/g, "").replace(/\n/g,""))
  $('.bd-ProductDetails-list li').each(function(i){
    data.caracteristique.push($(this).text().trim().replace(/\t/g, "").replace(/\n/g,""))
  })
  data.marque = $('.r-Grid-cell.r-all--1of2.r-maxM--1of3.bd-ProductCard-brand').text().trim()
  var verif2 = $('.bd-ProductView-item.jsbd-ProductView-item.jsbd-ProductView-item--typeImage.jsbd-gtm-zoomProduct')
  if (verif2 && verif2.length > 0){

    data.srcImage = $('.bd-ProductView-item.jsbd-ProductView-item.jsbd-ProductView-item--typeImage.jsbd-gtm-zoomProduct').attr("data-src")
  }else{
    data.srcImage = $('.bd-KitchenSlide.jsbd-ProductView-item.jsbd-ProductView-item--typeImage.jsbd-gtm-zoomProduct img').attr('src')
  }
  data.prix = $('.bd-Price-current').text().trim()

  verif1 = $('.bd-Price-ecopart.bd-Price-minor')
  if( verif1 && verif1.length > 0){
    data.prixUnite = $('.bd-Price-ecopart.bd-Price-minor').text().trim()
  }
  var verif = $('.bd-ProductView-status img')
  if (verif && verif.length > 0){
    data.ancienPrix = $('.bd-Price-old').text().trim()
    data.promoDirecte = $('.bd-ProductView-status').text().trim()
  }
  data.promo = data.ancienPrix || data.promoDirecte ? 1 : 0

  data.ean = undefined

  if (_.isEmpty(data)){
    this.logger.warn("Empty data on product page: ", req.url);
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
