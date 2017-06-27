var Engine = require('../engine/engine'),
  cheerio = require('cheerio'),
  async = require('async'),
  _ = require('underscore')

function Weldom (use_proxy) {
  this.name = 'weldom'
  this.use_proxy = use_proxy
  Engine.call(this)
  this.on('stores', this.parseStores)
  this.on('patch', this.patch)
  this.on('home', this.home)
}

Weldom.prototype = Object.create(Engine.prototype)

Weldom.prototype.call = function (params) {
  if (params.stores) {
    this.stores = params.stores
  }
  logger.info('Parameters call engine', params)

  this.request({
    url: 'https://www.weldom.fr',
    origin: params
  }, 'home')
}

Weldom.prototype.constructor = Weldom

Weldom.prototype.home = function (html, req) {
  logger.info('Home view: ', this.stores !== undefined && this.stores.length > 0)
  if (req.origin) {
    req = req.origin
  }
  if (this.stores !== undefined && this.stores.length > 0) {
    this.aspireOnStore(req)
  } else {
    this.getStores(req)
  }
}

Weldom.prototype.getStores = function (params) {
  this.request({
    url: 'https://www.weldom.fr/lege/adresses-magasins',
    origin: params
  },
    'stores')
}

Weldom.prototype.parseStores = function (html, req, response) {
  var that = this
  // console.log(html)
  var $ = cheerio.load(html)
  that.stores = []
  logger.info('Rentré dans Weldom_MagasinList')

  $('#contenair-mag a').each(function (idx) {
    var url = $(this).attr('href')
    var verif = $(this).text().trim()
    if (verif && verif.length > 0) {
      try {
        url = url.replace("\"https", "http");
        var ville = url.split('http://www.weldom.fr/')[1].split('/')[0]
        logger.info('Ville', ville, url)
        var urlMag = url + 'customdev/index/getWebsiteUrl/?storelocator_id%5Bstorelocator%5D=' + ville + '&url=%2F' + ville + '%2F'
        var magasin = $(this).text().trim()
        logger.info(magasin, urlMag)
        that.stores.push({
          name: magasin,
          url: urlMag,
          id: magasin
        })

        logger.debug('Weldom_MagasinList', this.stores)
      } catch (e) {
        logger.error('Error on parseStores', e)
      }
    }
  })
  this.aspireOnStore(req.origin)
}

Weldom.prototype.aspireOnStore = function (req) {
  var that = this
  logger.info(that.stores)
  // var MagasinId = response.cookies
  req.stores = this.stores
  async.eachLimit(this.stores, this.config.parallel, function (magasin, next) {
    var param = _.clone(req)
    param.magasin = magasin
    logger.debug('Prod Mag Url', magasin.url)
    that.request({
      url: magasin.url,
      origin: param,
      callback: next
    },'patch')
  })
}

Weldom.prototype.patch = function (html, req, response) {
  logger.info('Cookies ===>', response.cookies.shop_id) // _.omit(response, ['body']
  logger.info('Lien Mag' , req.origin.magasin.url)
  req.origin.magasin.id = response.cookies.shop_id;
  if (req.origin.magasin.id){
    try {
      var id = parseInt(req.origin.magasin.id);
      if (isNaN(id)){
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
    logger.debug('Url du Produit', req.url);
    this.request(req.origin, req.callback);
  } else {
    req.origin.magasin.id = '' + response.cookies.shop_id;
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
  var $ = cheerio.load(html)
  // req.magasin.id = response.cookies.shop_id
  logger.info('Id Mag in Decode', response.cookies) // _.omit(response, ['body']
  logger.debug('*********Fiche**************', req)
  /* ------------------------------------------------------------------------ */
  // manage fail
  if ($('.errorPage').length > 0) {
    var output = {
      requestID: req.requestID,
      error: 'produit non disponible',
      data: undefined,
      req: req
    }
    return this.emit('not_found', output)
  }

  data = {}
  data.timestamp = new Date()
  data.enseigne = req['Enseigne']
  data.magasin = req.magasin

  data.categories = []

  data.libelles = [$('.product-name>h1').text().trim()];

  $('.grid-full.breadcrumbs ul li').each(function (i) {
    data.categories.push($(this).find('a').text().trim())
  })
  data.marque = $('[class="odd"] .data.last').text().trim()
  data.srcImage = $('#image-main').attr('src')
  // data.idProduit =
  var verif1 = $('.old-price')
  if (verif1 && verif1.length > 0) {
    data.ancienPrix = $('.old-price .price').text().trim()
  }else {
    data.prix = $('.regular-price .price').text().trim()
  }
  data.promo = data.ancienPrix ? 1 : 0
  var verif = $('.prome-position')
  if (verif && verif.length > 0) {
    data.promoDirecte = $('.prome-position').text().trim()
  }
  var ean = html.split('>code barre</th>')[1].split('</td>')[0]
  data.ean = ean.split('"data">')[1]
  logger.info(data)

  var output = {
    requestID: req.requestID,
    data: data,
    stores: this.stores
  }

  this.emit('product', output)
}

module.exports = Weldom
