var Engine = require('../engine/engine'),
  logger = require('log4js').getLogger('Bricoman'),
  cheerio = require('cheerio'),
  _ = require('underscore');

function Bricoman(use_proxy){
  this.name = "bricoman";
  this.use_proxy = use_proxy;
  Engine.call(this);
  this.on("stores", this.parseStores);
  this.on("home", this.home);

};

Bricoman.prototype = Object.create(Engine.prototype);

Bricoman.prototype.call = function (params) {
  if (params.stores){
    this.stores = params.stores;
  }
  logger.info("Parameters call engine", params);
  //this.home(null, params);

  this.request({
    url: "https://www.bricoman.fr",
    origin: params
  }, 'home');


  /*
    params.cookies = {
      'smile_retailershop_id': '21'
    };
    logger.info("Calls engine with: ", params);
    this.request(params);
  */
};

Bricoman.prototype.constructor = Bricoman;

Bricoman.prototype.home = function (html, req) {
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

Bricoman.prototype.getStores = function(params){
  this.request({
    url: "https://www.bricoman.fr/nos-magasins.html",
    origin: params
  },
  "stores");
};

Bricoman.prototype.aspireOnStore = function(req){
  var that = this;
  req.stores = this.stores;
  _.each(this.stores, function(magasin){
    var param = _.clone(req);
    param.magasin = magasin;
    param.cookies = {
      'smile_retailershop_id': magasin.id
    };
    logger.info("Bricoman_MagasinList", magasin.name);
    that.request(param);
  });
};

Bricoman.prototype.parseStores = function (html, req, response) {
  var that = this;
  logger.info(response.cookies);
  // console.log(html);
	var $ = cheerio.load(html);
  that.stores = [];
	logger.info("Rentré dans Bricoman_MagasinList");

	$("[id='shop_chooser'] option").each(function(idx) {
		var url = $(this).attr('value')
		var Magasin =  $(this).text().trim()
		var MagasinId =  $(this).attr('data-shop-id')

		logger.debug(Magasin, url, MagasinId)
    that.stores.push({
      name: Magasin,
      id: MagasinId
    });
	});

  logger.debug("Bricoman_MagasinList", this.stores);

  this.aspireOnStore(req.origin);
};

Bricoman.prototype.decode = function (html, req) {
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

  /* ------------------------------------------------------------------------ */
	var data = {};
	data.enseigne = req['Enseigne'];
	data.magasin = req.magasin;
	data.categories = []

	try {
		data.marque = html.split('"marque":"')[1].split('","')[0]
	} catch (e) {
		if (html.split('"brand":"')[1]) {
			data.marque = html.split('"brand":"')[1].split('","')[0]
		}else {
			data.marque = ""
		}
	}

	data.srcImage = $("[itemprop='image']").attr('src')
	data.libelles = [];
	data.libelles.push($(".product-name [itemprop='name']").text().trim());

	try {
		data.idProduit = html.split('"sku":"')[1].split('","')[0]
	} catch (e) {
		data.idProduit = ""
	}

	try {
		data.ean =  html.split('"ean_code":"')[1].split('","')[0]
	} catch (e) {
		data.ean = undefined;
	}

	$(".breadcrumbs [class*='category']").each(function (i) {
		data.categories.push($(this).find("[itemprop='item']").attr('title'))
		logger.debug('Cat: ', data.categories[i] )
	})

	data.prix = $(".item-price [itemprop='price']").text().trim().replace(/  /g,"");

	if ($(".item-price .old-price").length > 0) {
		logger.debug("HAVE OLD PRICE");
		data.ancienPrix = $(".item-price  p.old-price span.price span").first().text().trim()
	}

	data.prixUnite = $(".item-price  .unit").first().text().trim()
	//data.categories = obj.tree;
	data.timestamp = +(new Date());
	data.promo = data.ancienPrix ? 1 : 0;
	data.promoDirecte = data.promo;
	data.dispo = ($(".availability.in-stock .label").text().indexOf('En stock') > 0) ? 1 : 0;
	data.caracteristique = [];

	$(".product-attributes-container .first").each(function () {
		var attribut = $(this).find('.label').text().trim();
		var valeur = $(this).find('.data').text().trim();
		data.caracteristique.push(attribut+" = "+valeur);
		// Conditionnement
		//logger.logValColor((attribut.indexOf('Contenance') >= 0 && valeur !='0') ? 1 : 0)

		if (attribut.indexOf('Contenance') >= 0 && valeur !='0' ) {
			data.conditionnement = valeur

		} else if (attribut.indexOf('Conditionnement') >= 0 && valeur !='0' && !data.conditionnement) {
			data.conditionnement = valeur

		}
	})

	var text = $("[itemprop='description']").text().trim()
	text = text.replace(/\n/g, "").replace(/\t/g, "").trim()

	var round = Math.ceil(text.length / 499);
	logger.debug(round);

	// we have to split the description into portions of 500 char in order to fit in the table
	var dep = 0
	for (var i = 0; i < round-1; i++) {
		logger.debug("from "+dep+" to "+(dep+499));
		var portion = text.substring(dep,(dep+499));
		logger.debug("Portion "+i+":",portion);
		data.caracteristique.push(portion);
		dep=dep+499;
	}
	logger.debug("from "+dep+" to "+text.length);
	var portion = text.substring(dep,(text.length));
	logger.debug("Portion "+i+":",portion);
	data.caracteristique.push(portion);


	if (data.caracteristique.length > 59) {
		logger.debug("NUMBER OF CARAC +" + data.caracteristique.length, req.lasturl);
	}


	//process.send({requestID:ReqObject.requestID,data:undefined}) // fail status test
	var output = {
		requestID : ReqObject.requestID,
		data			: data
	};
  this.emit('product', output);
};

module.exports = Bricoman
