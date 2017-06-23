var Engine = require('../engine/engine'),
  cheerio = require('cheerio'),
  _ = require('underscore');

function Weldom(use_proxy){
  this.name = "weldom";
  this.use_proxy = use_proxy;
  Engine.call(this);
  this.on("stores", this.parseStores);
  this.on("patch", this.patch);
  this.on("home", this.home);

};

Weldom.prototype = Object.create(Engine.prototype);

Weldom.prototype.call = function (params) {
  if (params.stores){
    this.stores = params.stores;
  }
  logger.info("Parameters call engine", params);

  this.request({
    url: "https://www.weldom.fr",
    origin: params
  }, 'home');
};

Weldom.prototype.constructor = Weldom;

Weldom.prototype.home = function (html, req) {
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

Weldom.prototype.getStores = function(params){
  this.request({
    url: "https://www.weldom.fr/lege/adresses-magasins",
    origin: params
  },
  "stores");
};

Weldom.prototype.parseStores = function (html, req, response) {
  var that = this;
  //console.log(html);
  var $ = cheerio.load(html);
  that.stores = [];
  logger.info("Rentré dans Weldom_MagasinList");

  $('#contenair-mag a').each(function(idx) {
    var url = $(this).attr('href')
    var verif = $(this).text().trim()
    if(verif && verif.length >0){
      try {
        var ville = url.split('http://www.weldom.fr/')[1].split('/')[0]
        logger.info('Ville', ville, url)
        var urlMag = url + "customdev/index/getWebsiteUrl/?storelocator_id%5Bstorelocator%5D=" + ville + "&url=%2F" + ville + "%2F"
        var magasin =  $(this).text().trim()
        logger.info(magasin, urlMag)
          that.stores.push({
            name : magasin,
            url: urlMag
          });

        logger.debug("Weldom_MagasinList", this.stores);
      } catch (e) {
          logger.error('Errer on parseStores', e)
        }
    }
  });
    this.aspireOnStore(req.origin);
}



Weldom.prototype.aspireOnStore = function(req){
  var that = this;
  logger.info(that.stores)
  //var MagasinId = response.cookies
  req.stores = this.stores;
  _.each(this.stores, function(magasin){
    var param = _.clone(req);
    param.magasin = magasin;
    //param.urlMag = magasin.url
    logger.info("Prod Mag Url", magasin.url);
    that.request({
      url: magasin.url,
      origin:param
      },
      "patch"
    )
  });
  //that.request(param);
};

Weldom.prototype.patch = function(html, req, response){
  logger.info('Cookies ===>', response.cookies.shop_id) //_.omit(response, ['body']
  logger.info('Lien Mag' , req.origin.magasin.url)
  var toReplace = req.origin.url.split('https://www.weldom.fr/')[1].split('/')[0]
  var prodUrl = req.origin.url.split(toReplace + '/')[1]
  req.url = req.origin.magasin.url.concat(prodUrl)
  logger.info('Url du Produit', req.url)
  this.request(req.origin);
};

Weldom.prototype.decode = function (html, req, response) {
  var $ = cheerio.load(html);
  //req.magasin.id = response.cookies.shop_id
  logger.info('Id Mag in Decode', response.cookies) //_.omit(response, ['body']
	logger.debug('*********Fiche**************', req);
	/* ------------------------------------------------------------------------ */
	// manage fail
  if ($('.errorPage').length > 0) {
		var output = {
			requestID  :  req.requestID,
			error      :	"produit non disponible",
			data       :  undefined,
      req        :  req
		};
    return this.emit('not_found', output);
	}

  data = {}
  data.timestamp = new Date()
  data.enseigne = req['Enseigne'];
  data.magasin = req.magasin;
  data.categories = [];
  $('.grid-full.breadcrumbs ul li').each(function (i) {
    data.categories.push($(this).find('a').text().trim())
  })
  data.marque = $('[class="odd"] .data.last').text().trim();
  data.srcImage = $('#image-main').attr('src');
  //data.idProduit = ;
  var verif1 = $('.old-price')
  if (verif1 && verif1.length > 0){
    data.ancienPrix = $('.old-price .price').text().trim();
  }else{
    data.prix = $('.regular-price .price').text().trim();
  }
  data.promo = data.ancienPrix? 1 : 0;
  var verif = $('.prome-position');
  if (verif && verif.length > 0){
    data.promoDirecte = $('.prome-position').text().trim();
  }
  var ean = html.split('>code barre</th>')[1].split('</td>')[0];
  data.ean = ean.split('"data">')[1];
  logger.info(data);

	var output = {
		requestID : req.requestID,
		data			: data
	};

  this.emit('product', output);
};

module.exports = Weldom
