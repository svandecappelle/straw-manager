var Engine = require('../engine/engine'),
  async = require('async'),
  cheerio = require('cheerio'),
  _ = require('underscore');

function Bricorama(use_proxy){
  this.name = "bricorama";
  this.use_proxy = use_proxy;
  Engine.call(this);
  this.on("stores", this.parseStores);
  this.on("home", this.home);

};

Bricorama.prototype = Object.create(Engine.prototype);

Bricorama.prototype.call = function (params) {
  if (params.stores){
    this.stores = params.stores;
  }
  logger.info("Parameters call engine", params);

  this.request({
    url: "http://www.bricorama.fr",
    origin: params
  }, 'home');
};

Bricorama.prototype.constructor = Bricorama;

Bricorama.prototype.home = function (html, req) {
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

Bricorama.prototype.getStores = function(params){
  this.request({
    url: "http://www.bricorama.fr/",
    origin: params
  },
  "stores");
};

Bricorama.prototype.parseStores = function (html, req, response) {
  var that = this;
  //logger.info(response.cookies);
  // console.log(html);
  var $ = cheerio.load(html);
  that.stores = [];
  logger.info("Rentré dans Bricorama_MagasinList");
  var jsCont = html.split("BricoramaStoreLocator.vars.map.markers = ")[1].split("});")[0]
  jsCont = jsCont.replace(';', '')
  jsCont = jsCont.substring(0, jsCont.lastIndexOf(',')) + ']'
  try {
    var infoMag = JSON.parse(jsCont)
  } catch (e) {
    console.log("Parse == null", e)

  }
  for (var i = 0; i < infoMag.length; i++) {
    console.log(' infoMag ' + infoMag[i].id);
    var Magasin = infoMag[i].label
    var MagasinId = infoMag[i].id
    var desc = infoMag[i].description
    var dont = false
    if(desc.indexOf('span class="error">')>= 0 ){
        //dont = true
        logger.info('Pas de vente en ligne', MagasinId)
    }
    if (!dont) {
      that.stores.push({
        name: Magasin,
        id: MagasinId
      });
    }

  };
  logger.info("Bricorama_MagasinList", this.stores);
  this.aspireOnStore(req.origin);
}


Bricorama.prototype.aspireOnStore = function(req){
  var that = this;
  req.stores = this.stores;
  logger.info("req.stores ===>", req.stores);
  async.each(this.stores, function(magasin){
    var param = _.clone(req);
    param.magasin = magasin;

    param.cookies = {
      'smile_retailershop_id': magasin.id
    };
       that.request(param);
  });
};


Bricorama.prototype.decode = function (html, req, response) {
  var $ = cheerio.load(html);
	var ReqObject = req;

	/* ------------------------------------------------------------------------ */
	// manage fai

	   if ( html.indexOf('productId = ') ==-1) {
		     var output = {
			        requestID  :  ReqObject.requestID,
			        error      :	"produit non disponible",
			        data       :  undefined
              req        :  req
		  };
      return this.emit('not_found', output);
	   }


  /* ------------------------------------------------------------------------ */
	var data = {}
  data.timestamp = +(new Date())
	data.enseigne = req['Enseigne']
  data.magasin = req.magasin
  data.categories = []
  $('.breadcrumbs li').each(function(i){
    data.categories.push($(this).text().trim().split('\n')[0])
  })
  data.marque = $('.product-brand-logo img').attr('title')
  data.srcImage = $('.product-image-gallery img').first().attr('src')
  data.libelles = []
  data.libelles.push($('.product strong').text().trim());
  data.idProduit = html.split('productId = ')[1].split(';')[0];
  data.ean = undefined
  var verif = $('.product-shop .old-price')
  if (verif && verif.length > 0){
    data.ancienPrix = $('.product-shop .price-box .old-price .price').first().text().trim();
    data.prix = $('.product-shop .price-box .special-price .price').first().text().trim();
  }else{
    data.prix = $('.product-shop .price-box .regular-price .price').first().text().trim();
  }
  data.promo = data.ancienPrix? 1 : 0
  //data.prixUnite =
  //data.Promodirecte =
  //data.dispo =
  logger.info(data)

  var output = {
    requestID : ReqObject.requestID,
    data			: data
  };

  this.emit('product', output);
};

module.exports = Bricorama
