var Engine = require('../engine/engine'),
  cheerio = require('cheerio'),
  async = require('async'),
  htmlToText = require('html-to-text'),
  _ = require('underscore');

function Mrbricolage (use_proxy) {
  this.name = 'MrBricolage';
  this.use_proxy = use_proxy;
  Engine.call(this);
  this.on('stores', this.parseStores);
  this.on('patch', this.patch);
  this.on('home', this.home);
  this.on('setStores', this.setStores);
}

Mrbricolage.prototype = Object.create(Engine.prototype);

Mrbricolage.prototype.call = function (params) {
  if (params.stores) {
    this.stores = params.stores;
  }
  this.logger.trace('Parameters call engine', params);

  this.request({
    url: 'https://www.mr-bricolage.fr',
    origin: params
  }, 'home');
}

Mrbricolage.prototype.constructor = Mrbricolage;

Mrbricolage.prototype.home = function (html, req) {
  this.logger.debug('Home view: ', this.stores !== undefined && this.stores.length > 0);
  if (req.origin) {
    req = req.origin;
  }
  if (this.stores !== undefined && this.stores.length > 0) {
    this.aspireOnStore(req);
  } else {
    this.stores = [];
    this.getStores(req);
  }
}

Mrbricolage.prototype.getStores = function (params) {
  this.logger.trace('Params in getStores', params);
  this.request({
    url: 'https://magasin.mr-bricolage.fr/fr',
    origin: params
  }, 'stores');
}

Mrbricolage.prototype.parseStores = function (html, req, response) {
  this.goToAspireOnStore = false;
  var that = this;
  var $ = cheerio.load(html);
  this.logger.info('Rentré dans MrBricolage_MagasinList');

  var listMag = $('.lf-geo-divisions__results__content__locations__list .lf-geo-divisions__results__content__locations__list__item');

  listMag.each(function (idx) {
    var param = _.clone(req);
    var url = $(this).find('> h2 > a').attr('href');
    if (url.indexOf('https://magasin.mr-bricolage.fr') == -1) {
      url = 'https://magasin.mr-bricolage.fr' + url;
    }
    that.logger.debug('url Magasin', url);
    that.request({
      url: url,
      origin: param
    }, 'setStores');
  });

  var pagination = $('.lf-geo-divisions__results__content__locations .lf-pagination__list [rel="next"]');
  if (pagination && pagination.length > 0) {
    var next = pagination.attr('href');
    that.logger.trace('MrBricolage_MagasinList Pagination to ', next);
    that.request({
      url: next,
      origin: req.origin
    }, 'stores');
  } else {
    // Pour éviter le lancement d'AspireOnStore avant d'avoir pushé l'intégralité des mags
    setTimeout(function () {
      that.logger.trace('Plus de Pagination, Go to aspireOnStore');
      var launch = _.clone(req);
      launch.origin.goToAspireOnStore = true;
      that.request({
        url: 'https://magasin.mr-bricolage.fr/',
        origin: launch.origin
      }, 'setStores');
    }, 1500);
  }
}

Mrbricolage.prototype.setStores = function (html, req, response) {
  var $ = cheerio.load(html);
  this.logger.trace('REQ in setStores', req);

  if (req.origin.goToAspireOnStore) {
    this.aspireOnStore(req.origin);
  } else {
    try {
      var idMag = html.split('customId')[1].split(',')[0];
      idMag = idMag.replace(/"/g, '').replace(/:/g, '').trim();
      var magasin = $('.lf-location__store__header__title').text().trim();
      if (this.stores.indexOf(idMag) == -1) {
        this.stores.push({
          name: magasin,
          id: idMag
        });
        this.logger.trace('IDMAG', idMag);
        this.logger.trace(' Push === Store Length', this.stores.length);
      }
    } catch (e) {
      this.logger.error('setStores', e);
    }
  }
}

Mrbricolage.prototype.aspireOnStore = function (req) {
  var that = this;

  req.stores = this.stores;
  that.logger.trace('Store length', that.stores.length);
  async.eachLimit(this.stores, this.config.parallel, function (magasin, next) {
    var param = _.clone(req);
    param.magasin = magasin;
    that.logger.trace('MAGASIN', magasin);
    param.opts = {
      'method': 'POST',
      'data': {'magasin_id': magasin.id},
      'addHeaders': {'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'fr-FR,fr;q=0.8,en-US;q=0.6,en;q=0.4',
        'Connection': 'keep-alive',
        'X-Requested-With': 'XMLHttpRequest'
      }
    };

    that.request({
      url: 'https://www.mr-bricolage.fr/shop?magasin_id=' + magasin.id,
      origin: param,
      callback: next
    }, 'patch');
  });
}

Mrbricolage.prototype.patch = function (html, req, response) {
  this.logger.trace('In Patch req' , req.origin.url);
  if (response.statusCode == 503) {
    this.logger.warn('url non conforme' , req.origin.url);
    this.emit('not_found', {
      requestID: req.origin.requestID,
      error: 'magasin non disponible',
      data: undefined,
      req: req.origin
    }, req.origin);

    return req.callback();
  }
  this.logger.trace('Params in Patch', req.origin.magasin);

  var $ = cheerio.load(html);
  req.origin.opts = undefined;
  req.origin.url = req.origin.url.split('?magasin')[0];
  req.origin.cookieMag = response.cookies.magasin;
  req.origin.url = req.origin.url + '?magasin=' + req.origin.cookieMag;
  this.logger.trace('Req origin url ===>' , req.origin.url);
  req.opts = undefined;
  this.request(req.origin, req.callback);
}

Mrbricolage.prototype.decode = function (html, req, response) {
  this.logger.info('Product decode', req.origin ? req.origin : req.url, req.magasin.name);
  var $ = cheerio.load(html);

  var verif = html.indexOf('/?magasin=');
  this.logger.trace('MAGASIN', req.magasin);
  if (response.statusCode == 404) {
    this.logger.warn('Page introuvable in Decode' , req.magasin);
    return this.emit('not_found', {
      requestID: req.requestID,
      error: 'Page introuvable',
      data: undefined,
      req: req
    }, req);
  } else if (verif < 0) {
    this.logger.warn('Magasin non disponible in Decode' , req.magasin);
    return this.emit('not_found', {
      requestID: req.requestID,
      error: 'magasin non disponible',
      data: undefined,
      req: req
    }, req);
  } else {
    data = {};
    data.timestamp = new Date();
    data.enseigne = req['Enseigne'];
    data.magasin = req.magasin;
    try {
      data.srcImage = html.split('"img":"')[1].split('"')[0];
      data.srcImage = data.srcImage.replace(/\\/g, '');
    } catch (e) {
      this.logger.debug('Erreur sur srcImage', e);
      data.srcImage = $('[property="og:image"]').attr('content');
    }
    data.libelles = [$('.column.main .page-title').text().trim()];
    data.ancienPrix = $('.column.main .old-price .price-wrapper').text().trim();
    data.promoDirecte = $('.column.main .product-info-price .promotion').text().trim();
    data.promo = (data.ancienPrix || data.promoDirecte) ? 1 : 0;
    data.prix = $('.column.main [itemprop="price"]').text().trim();
    if (!data.prix || data.prix.indexOf('0,00') === 0) {
      return this.emit('not_found', {
        requestID: req.requestID,
        error: 'Pas de prix',
        data: undefined,
        req: req
      }, req);
    }
    data.idProduit = $(".price-box.price-final_price").data("product-id");

    data.origine = $('.column.main .product-info-main .product__delivery').text().trim()
    $('.caracteristiques-techniques #product-attribute-specs-table tr').each(function () {
      if ($(this).find('.col.label').text().trim() == 'Marque') {
        data.marque = $(this).find('.col.data').text().trim();
      }
      if ($(this).find('.col.label').text().trim() == 'EAN') {
        data.ean = $(this).find('.col.data').text().trim();
      }
      if ($(this).find('.col.label').text().trim() == 'Réf:') {
        data.cip7 = $(this).find('.col.data').text().trim();
      }
      if ($(this).find('.col.label').text().trim() == 'ANPF') {
        data.cip13 = $(this).find('.col.data').text().trim();
      }
    });
    data.caracteristique = [];
    var carac = $('.caracteristiques-techniques').html();

    var text = htmlToText.fromString(carac, { wordwrap: false });
    text = text.replace(/\n/g, ' ').replace(/\r/g, ' ').trim();
    round = Math.ceil(text.length / 499);

    // we have to split the description into portions of 500 char in order to fit in the table
    var dep = 0;
    for (var i = 0; i < round - 1; i++) {
      var portion = text.substring(dep, (dep + 499));
      data.caracteristique.push(portion);
      dep = dep + 499;
    }
    var portion = text.substring(dep, (text.length));
    data.caracteristique.push(portion);
    this.logger.trace('DATA === ', data);

    var output = {
      requestID: req.requestID,
      data: data,
      stores: this.stores
    };

    this.emit('product', output);
  }
}

module.exports = Mrbricolage
