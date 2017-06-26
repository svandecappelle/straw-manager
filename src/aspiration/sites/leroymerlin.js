var Engine = require('../engine/engine'),
  cheerio = require('cheerio'),
  logger = require('log4js').getLogger('LeroyMerlin'),
  _ = require('underscore');

function LeroyMerlin(use_proxy){
  this.name = "leroymerlin";
  this.use_proxy = use_proxy;
  Engine.call(this);
  this.on("stores", this.parseStores);
  this.on("home", this.home);

};

LeroyMerlin.prototype = Object.create(Engine.prototype);

LeroyMerlin.prototype.call = function (params) {
  if (params.stores){
    this.stores = params.stores;
  }
  logger.info("Parameters call engine", params);

  this.request({
    url: "https://www.leroymerlin.fr",
    origin: params
  }, 'home');
};

LeroyMerlin.prototype.constructor = LeroyMerlin;

LeroyMerlin.prototype.home = function (html, req) {
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

LeroyMerlin.prototype.getStores = function(params){
  this.request({
    url: "https://www.leroymerlin.fr/v3/p/magasins-l1308220543",
    origin: params
  },
  "stores");
};

LeroyMerlin.prototype.parseStores = function (html, req, response) {
  var that = this;
  // console.log(html);
  var $ = cheerio.load(html);
  that.stores = [];
  logger.info("Rentré dans LeroyMerlin_MagasinList");

  $(".notvisible a").each(function(idx) {
    var url = $(this).attr('href')
    var Magasin =  $(this).text().trim()
    var MagasinId =  $(this).attr('data-storeid')
    //logger.info('Magasin ==>', Magasin, MagasinId)

    //logger.info(Magasin, url, MagasinId)
    that.stores.push({
      name: Magasin,
      id: MagasinId
    });
  });
  logger.debug("LeroyMerlin_MagasinList", this.stores);
  this.aspireOnStore(req.origin);
};

LeroyMerlin.prototype.aspireOnStore = function(req){
  var that = this;
  req.stores = this.stores;
  _.each(this.stores, function(magasin){
    var param = _.clone(req);
    param.magasin = magasin;
    param.cookies = {
      "store": "store=" +  magasin.id
    };
    that.request(param);
  });
};

LeroyMerlin.prototype.decode = function (html, req) {
  var $ = cheerio.load(html);
	logger.debug('*********Fiche**************', req);
	var ReqObject = req;

	/* ------------------------------------------------------------------------ */
	// manage fail
	if ($('.errorPage').length > 0) {
		var output = {
			requestID  :  ReqObject.requestID,
			error      :	"produit non disponible",
			data       :  undefined,
      req        :  req
		};
    return this.emit('not_found', output);
	}

/* ------------------------------------------------------------------------ */

  var data = {}
  data.timestamp = new Date()
  data.enseigne =  req['Enseigne'];
  data.magasin = req.magasin ;
  data.categories = [];
  $('.breadcrumb li').each(function(i){
    data.categories.push($(this).find('a').text().trim())
  })
  data.marque = $('.logo-marque.marque-top img').attr('alt');
  data.srcImage =  $('.media.fRight #zoom-area img').first().attr('src');
  data.libelles = [] ;
  data.libelles.push($('.showcase-product h1').text().trim()) ;
  data.idProduit = $('.showcase-product').attr('data-prd-id');
  data.prix = $('p.price').first().text().trim();
  var verif = $('span[class="picto-marque promo"]').first().text()
  if (verif && verif.length > 0) {
    data.ancienPrix = $('p.infos em.barred em').first().text().trim()
    data.promoDirecte = $('.picto-marque.promo').first().text().trim()
  }
  data.promo = data.ancienPrix? 1 : 0 ;
  data.ean = html.split('product_ean :')[1].split(',')[0].replace(/'/g, '');
  logger.info(data)

  var output = {
    requestID : req.requestID,
    data			: data,
    stores    : this.stores
  };

  this.emit('product', output);
};
module.exports = LeroyMerlin;
