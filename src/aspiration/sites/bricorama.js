var Engine = require('../engine/engine'),
  async = require('async'),
  cheerio = require('cheerio'),
  _ = require('underscore');

class Bricorama extends Engine {
  
  constructor(use_proxy) {
    super();
    this.name = "Bricorama";
    this.use_proxy = use_proxy;
    this.on("pages", this.parsepages);
    this.on("home", this.home);
  };

  call(params) {
    if (params.pages) {
      this.pages = params.pages;
    }
    this.logger.info("Parameters call engine", params);

    this.request({
      url: "http://www.bricorama.fr",
      origin: params
    }, 'home');
  };

  home(html, req) {
    this.logger.debug("Home view: ", this.pages !== undefined && this.pages.length > 0);
    if (req.origin) {
      req = req.origin
    }
    if (this.pages !== undefined && this.pages.length > 0) {
      this.aspireOnStore(req);
    } else {
      this.getpages(req);
    }
  };

  getpages (params) {
    this.request({
      url: "http://www.bricorama.fr/",
      origin: params
    },
      "pages");
  };

  parsepages(html, req, response) {
    var that = this;
    //logger.info(response.cookies);
    // console.log(html);
    var $ = cheerio.load(html);
    that.pages = [];
    this.logger.debug("Rentré dans Bricorama_MagasinList");
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
      if (desc.indexOf('span class="error">') >= 0) {
        //dont = true
        this.logger.debug('Pas de vente en ligne', MagasinId)
      }
      if (!dont) {
        that.pages.push({
          name: Magasin,
          id: MagasinId
        });
      }

    };
    this.aspireOnStore(req.origin);
  }


  aspireOnStore (req) {
    var that = this;
    req.pages = this.pages;
    async.eachLimit(this.pages, this.config.parallel, function (magasin, next) {
      var param = _.clone(req);
      param.magasin = magasin;

      param.cookies = {
        'smile_retailershop_id': magasin.id
      };
      that.request(param, next);
    });
  };


  decode(html, req, response) {
    this.logger.info('Product decode', req.origin ? req.origin : req.url, req.magasin.name);

    var $ = cheerio.load(html);
    var ReqObject = req;

    /* ------------------------------------------------------------------------ */
    // manage fai

    if (html.indexOf('productId = ') == -1) {
      var output = {
        requestID: ReqObject.requestID,
        error: "produit non disponible",
        data: undefined,
        req: req
      };
      return this.emit('not_found', output);
    }


    /* ------------------------------------------------------------------------ */
    var data = {}
    data.timestamp = new Date()
    data.enseigne = req['Enseigne']
    data.magasin = req.magasin
    data.categories = []
    $('.breadcrumbs li').each(function (i) {
      data.categories.push($(this).text().trim().split('\n')[0])
    })
    data.marque = $('.product-brand-logo img').attr('title')
    data.srcImage = $('.product-image-gallery img').first().attr('src')
    data.libelles = []
    data.libelles.push($('.product strong').text().trim());
    data.idProduit = html.split('productId = ')[1].split(';')[0];
    data.ean = undefined
    var verif = $('.product-shop .old-price')
    if (verif && verif.length > 0) {
      data.ancienPrix = $('.product-shop .price-box .old-price .price').first().text().trim();
      data.prix = $('.product-shop .price-box .special-price .price').first().text().trim();
    } else {
      data.prix = $('.product-shop .price-box .regular-price .price').first().text().trim();
    }
    data.promo = data.ancienPrix ? 1 : 0
    //data.prixUnite =
    //data.Promodirecte =
    //data.dispo =
    this.logger.debug("Price: ", data.libelles, data.prix);
    var output = {
      requestID: ReqObject.requestID,
      data: data,
      pages: this.pages
    };

    this.emit('product', output);
  }
}

module.exports = Bricorama;
