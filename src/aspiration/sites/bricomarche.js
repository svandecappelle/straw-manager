var Engine = require('../engine/engine'),
  async = require('async'),
  cheerio = require('cheerio'),
  _ = require('underscore')

function Bricomarche (use_proxy) {
  this.name = 'Bricomarche'
  this.use_proxy = use_proxy
  Engine.call(this)
  this.on('stores', this.parseStores)
  this.on('home', this.home)
}

Bricomarche.prototype = Object.create(Engine.prototype)

Bricomarche.prototype.call = function (params) {
  if (params.stores) {
    this.stores = params.stores
  }
  this.logger.info('Parameters call engine', params)

  this.request({
    url: 'https://www.bricomarche.com',
    origin: params
  }, 'home')
}

Bricomarche.prototype.constructor = Bricomarche

Bricomarche.prototype.home = function (html, req) {
  this.logger.debug('Home view: ', this.stores !== undefined && this.stores.length > 0)
  if (req.origin) {
    req = req.origin
  }
  if (this.stores !== undefined && this.stores.length > 0) {
    this.aspireOnStore(req)
  } else {
    this.getStores(req)
  }
}

Bricomarche.prototype.getStores = function (params) {
  this.request({
    url: 'http://magasins.bricomarche.com/',
    origin: params
  },
    'stores')
}

Bricomarche.prototype.aspireOnStore = function (req) {
  var that = this
  req.stores = this.stores;

  if (req.origin){
    req.origin.stores = this.stores;
  }

  console.log("launch on parallel:", this.config.parallel);

  async.eachLimit(this.stores, this.config.parallel, function (magasin, next) {
    var param = _.clone(req)
    param.magasin = magasin
    param.cookies = {
      'ID_PDV': magasin.id
    }
    this.logger.debug('Param In aspireOnStore', param.url)
    that.request(param, next);

  }, function(err){
    console.log(err);
    console.log("Done");
  });
}

Bricomarche.prototype.parseStores = function (html, req, response) {
  var that = this
  // this.logger.info(response.cookies)
  // console.log(html)

  var $ = cheerio.load(html)
  that.stores = []
  this.logger.debug('Rentré dans Example_MagasinList')

  $("[id='select_advmag']").first().find('option').each(function (idx) {
    var urlMag = $(this).attr('value')
    var Magasin = $(this).text().trim()

    var MagasinId = urlMag.substring(urlMag.lastIndexOf('/') + 1).trim()

    that.logger.debug(Magasin, MagasinId)

    that.stores.push({
      id: MagasinId,
      name: Magasin
    })
  })

  this.logger.debug('Example_MagasinList', this.stores)

  this.aspireOnStore(req.origin)
}

Bricomarche.prototype.decode = function (html, req, response) {
  var $ = cheerio.load(html)
  this.logger.debug('*********Fiche**************', response.cookies)
  /* ------------------------------------------------------------------------ */
  // manage fail
  if ($('.label-store-name').length == -1) {
    var output = {
      requestID: req.requestID,
      error: 'Impossible de rentrer dans le magasin',
      data: undefined,
      req: req
    }
    return this.emit('not_found', output, { 'message': output.error })
  }

  if ($('span[class="product_avaliable product_avaliable-online-only"]').first().length > 0) {
    var output = {
      requestID: req.requestID,
      error: 'produit non disponible',
      data: undefined,
      req: req
    }
    return this.emit('not_found', output, { 'message': output.error })
  }
  var data = {}

  var libelle1 = $('#h2-fiche-description').text().replace(/\n/g, '').replace(/\r/g, '').trim()
  var livraison = ($('.content-fiche-produit .onsale-product-container-inside').attr('style') &&
    $('.content-fiche-produit .onsale-product-container-inside').attr('style').indexOf('livraison_incluse') > 0)

  data.categories = []
  var nbNiv = $('div#breadcrumb ul li a').length
  $('div#breadcrumb ul li a').each(function (i, elm) {
    if (i > nbNiv - 1) {
      data.categories.push($(this).text())
    }
  })
  data.timestamp = new Date()
  data.enseigne = req['Enseigne']
  data.magasin = req.magasin
  data.libelles = []
  data.libelles.push(libelle1)
  if (livraison) {data.libelles.push('Livraison Incluse')}
  var textPrix = $('.fiche-price .new-price').first().text()
  // textPrix =  htmlToText.fromString($('.fiche-price .new-price').html(), { wordwrap: false }).replace(/\n/g," ")
  var prixUnite = textPrix.indexOf('soit') > 0
  data.prix = textPrix

  if (prixUnite) {
    data.prix = textPrix.split('soit')[0].trim()
    data.prixUnite = textPrix.split('soit')[1].trim()
  }
  data.prix = data.prix.trim()

  if (!data.prix) {
    return this.emit('not_found', {error: 'price not found on page', requestID: req.requestID, req, req}, req)
  }
  // data.ancienPrix =  htmlToText.fromString($('.fiche-price .old-price').html(), { wordwrap: false }).replace(/\n/g," ")
  data.ancienPrix = $('.fiche-price .old-price').first().text()

  var desc_html = $('.fiche-description').html()
  data.srcImage = $('#image').attr('src')

  try {
    var id = html.split("'id': '")[1].split("',")[0].trim()
    data.idProduit = id
  } catch (e) {
    // this.logger.logValColor(e)
  }

  try {
    var ref = desc_html.split('<p>Ref')[1].split('</p>')[0].trim()
    data.cip7 = ref; // idxProduit => cip7
  } catch (e) {
    // this.logger.logValColor(e)
  }

  try {
    var reference = desc_html.split('rence')[1].split('<')[0].trim()
    data.cip13 = reference; // idProduit2 => cip13
  } catch (e) {
    // this.logger.logValColor(e)
  }
  try {
    var marque = desc_html.split('<td><strong>Marque</strong></td>')[1].split('</td>')[0].trim().split('<td>')[1]
    data.marque = marque
  } catch (e) {
    // this.logger.logValColor(e)
  }

  data.promo = data.ancienPrix ? 1 : 0
  data.promoDirecte = data.promo

  // Code EAN

  data.ean = undefined
  var re = /([0-9]{13})/
  var str = data.srcImage
  var m

  if ((m = re.exec(str)) !== null) {
    data.ean = m[0]
  }

  data.dispo = ($('.product_avaliable').length > 0) ? 0 : 1
  data.caracteristique = []

  // console.log($('.fiche-description table tr').html())
  $('.fiche-description table tr').each(function () {
    var attribut = $(this).find('td').eq(0).text().trim()
    var valeur = $(this).find('td').eq(1).text().trim()
    data.caracteristique.push(attribut + ' = ' + valeur)
  })

  this.logger.trace('DATA', data)
  var output = {
    requestID: req.requestID,
    data: data,
    stores: this.stores
  }
  this.emit('product', output)
}

module.exports = Bricomarche
