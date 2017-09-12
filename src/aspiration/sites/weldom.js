var Engine = require('../engine/engine'),
    cheerio = require('cheerio'),
    async = require('async'),
    _ = require('underscore');

function Weldom (use_proxy) {
  this.name = 'Weldom';
  this.use_proxy = use_proxy;
  Engine.call(this);
  this.on('stores', this.parseStores);
  this.on('patch', this.patch);
  this.on('home', this.home);
}

Weldom.prototype = Object.create(Engine.prototype);

Weldom.prototype.call = function (params) {
  if (params.stores) {
    this.stores = params.stores;
  }
  this.logger.info('Parameters call engine', params);

  this.request({
    url: 'https://www.weldom.fr',
    origin: params
  }, 'home');
}

Weldom.prototype.constructor = Weldom

Weldom.prototype.home = function (html, req) {
  this.logger.debug('Home view: ', this.stores !== undefined && this.stores.length > 0);
  if (req.origin) {
    req = req.origin;
  }
  if (this.stores !== undefined && this.stores.length > 0) {
    this.aspireOnStore(req);
  } else {
    this.getStores(req);
  }
}

Weldom.prototype.getStores = function (params) {
  this.request({
    url: 'https://www.weldom.fr/lege/adresses-magasins',
    origin: params
  },
    'stores');
}

Weldom.prototype.parseStores = function (html, req, response) {
  this.logger.info('Rentré dans Weldom_MagasinList');
  var that = this;
  var $ = cheerio.load(html);
  that.i= 0;
  that.stores = [];

  $('#contenair-mag a').each(function (idx) {
    var url = $(this).attr('href');
    var verif = $(this).text().trim();
    if (verif && verif.length > 0) {
      try {
        url = url.replace("\"https", "http");
        var ville = url.split('http://www.weldom.fr/')[1].split('/')[0];
        var urlMag = url + 'customdev/index/getWebsiteUrl/?storelocator_id%5Bstorelocator%5D=' + ville + '&url=%2F' + ville + '%2F';
        var magasin = $(this).text().trim();
        that.stores.push({
          name: magasin,
          url: urlMag,
          id: magasin
        });

      } catch (e) {
        that.logger.error('Error on parseStores', e);
      }
    }
  })
  this.aspireOnStore(req.origin);
}

Weldom.prototype.aspireOnStore = function (req) {
  var that = this;
  req.stores = this.stores;
  async.eachLimit(this.stores, this.config.parallel, function (magasin, next) {
    var param = _.clone(req);
    param.magasin = magasin;
    that.request({
      url: magasin.url,
      origin: param,
      callback: next
    }, 'patch');
  })
}

Weldom.prototype.patch = function (html, req, response) {
  req.origin.magasin.id = '';
  if (response.cookies) {
    if (response.cookies.shop_id) {
      req.origin.magasin.id = response.cookies.shop_id;
    }
  }
  if ((req.origin.magasin.id) && (req.origin.magasin.id != '')){
    try {
      var id = parseInt(req.origin.magasin.id);
      if (isNaN(id)){
        this.logger.info('try  parse ID : ', req.origin.magasin);
        req.origin.magasin.id = '' + response.cookies.shop_id;
        this.emit('not_found', {
          requestID: req.origin.requestID,
          error: 'magasin non disponible',
          data: undefined,
          req: req.origin
        }, req.origin);

        return req.callback();
      }
    } catch( error){
      this.logger.info('catch error parse ID : ', req.origin.magasin);
      req.origin.magasin.id = '' + response.cookies.shop_id;
      this.emit('not_found', {
        requestID: req.origin.requestID,
        error: 'magasin non disponible',
        data: undefined,
        req: req.origin
      }, req.origin);

      return req.callback();
    }

    var protocol = 'http';
    if (req.origin.url.indexOf("https") === 0){
      protocol = 'https';
    }
    var toReplace = req.origin.url.split(protocol + '://www.weldom.fr/')[1].split('/')[0];
    var prodUrl = req.origin.url.split(toReplace + '/')[1];
    req.url = req.origin.magasin.url.concat(prodUrl);
    this.request(req.origin, req.callback);
  } else {
    req.origin.magasin.id = "-1";
    this.logger.info('No shop_id: ', req.origin.magasin);
    this.emit('not_found', {
      requestID: req.origin.requestID,
      error: 'magasin non disponible',
      data: undefined,
      req: req.origin
    }, req.origin);

    return req.callback();
  }
}

Weldom.prototype.decode = function (html, req, response) {
  this.logger.info('Product decode', req.origin ? 'origin: ' + req.origin + ' ----> now: ' + req.url : req.url, req.magasin.name);
  var $ = cheerio.load(html);
  // manage fail
  if ($('.errorPage').length > 0) {
    var output = {
      requestID: req.requestID,
      error: 'produit non disponible',
      data: undefined,
      req: req
    };
    return this.emit('not_found', output);
  }

  var data = {};
  data.timestamp = new Date();
  data.enseigne = req['Enseigne'];
  data.magasin = req.magasin;

  data.categories = [];

  data.libelles = [$('.product-name>h1').text().trim()];

  $('.grid-full.breadcrumbs ul li').each(function (i) {
    data.categories.push($(this).find('a').text().trim());
  })
  data.marque = $('[class="odd"] .data.last').text().trim();
  data.srcImage = $('#image-main').attr('src');
  // data.idProduit =
  var verif1 = $('.old-price')
  if (verif1 && verif1.length > 0) {
    data.ancienPrix = $('.old-price .price').text().trim();
  }else {
    data.prix = $('.regular-price .price').text().trim();
  }

  data.promo = data.ancienPrix ? 1 : 0;
  var verif = $('.prome-position');
  if (verif && verif.length > 0) {
    data.promoDirecte = $('.prome-position').text().trim();
  }
  var ean = html.split('>code barre</th>')[1].split('</td>')[0];
  data.ean = ean.split('"data">')[1];
  if (!data.prix || data.prix == "") {

    this.logger.info('No price: ', req.magasin.name);
    var output = {
      requestID: req.requestID,
      error: 'produit sans prix',
      data: undefined,
      req: req
    };
    return this.emit('not_found', output);

  }else {

    this.logger.debug("Price: ", data.libelles, data.prix);

    var output = {
      requestID: req.requestID,
      data: data,
      stores: this.stores
    };

    this.emit('product', output);
  }
}

module.exports = Weldom;
