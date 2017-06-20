var Engine = require('../engine/engine'),
  cheerio = require('cheerio'),
  _ = require('underscore');

function Example(use_proxy){
  this.name = "Example";
  this.use_proxy = use_proxy;
  Engine.call(this);
  this.on("stores", this.parseStores);
  this.on("home", this.home);

};

Example.prototype = Object.create(Engine.prototype);

Example.prototype.call = function (params) {
  if (params.stores){
    this.stores = params.stores;
  }
  logger.info("Parameters call engine", params);

  this.request({
    url: "https://www.Example.fr",
    origin: params
  }, 'home');
};

Example.prototype.constructor = Example;

Example.prototype.home = function (html, req) {
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

Example.prototype.getStores = function(params){
  this.request({
    url: "https://www.Example.fr/nos-magasins.html",
    origin: params
  },
  "stores");
};

Example.prototype.aspireOnStore = function(req){
  var that = this;
  req.stores = this.stores;
  _.each(this.stores, function(id){
    var param = _.clone(req);
    param.MagasinId = id;
    param.cookies = {
      'smile_retailershop_id': id
    };
    logger.info("Example_MagasinList", id);
    that.request(param);
  });
};

Example.prototype.parseStores = function (html, req, response) {
  var that = this;
  logger.info(response.cookies);
  // console.log(html);
	var $ = cheerio.load(html);
  that.stores = [];
	logger.info("Rentré dans Example_MagasinList");

	$("[id='shop_chooser'] option").each(function(idx) {
		var url = $(this).attr('value')
		var Magasin =  $(this).text().trim()
		var MagasinId =  $(this).attr('data-shop-id')

		logger.debug(Magasin, url, MagasinId)
    that.stores.push(MagasinId);
	});

  logger.debug("Example_MagasinList", this.stores);

  this.aspireOnStore(req.origin);
};

Example.prototype.decode = function (html, req) {
  var $ = cheerio.load(html);
	logger.debug('*********Fiche**************', req);
	var ReqObject = req;

	/* ------------------------------------------------------------------------ */
	// manage fail
	if ($('.std .top-content').text().trim() == "Produit non disponible") {
		var output = {
			requestID  :  ReqObject.requestID,
			error      :	"produit non disponible",
			data       :  undefined
		};
    return this.emit('fatal_error', { 'message': output.error }, output);
	}

	var output = {
		requestID : req.requestID,
		data			: data
	};
  this.emit('product', output);
};

module.exports = Example
