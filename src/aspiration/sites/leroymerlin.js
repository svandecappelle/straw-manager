var Engine = require('../engine/engine'),
  cheerio = require('cheerio'),
  async = require('async'),
  logger = require('log4js').getLogger('LeroyMerlin'),
  _ = require('underscore');

class LeroyMerlin extends Engine {

  constructor(use_proxy) {
    super();
    this.name = "LeroyMerlin";
    this.use_proxy = use_proxy;
    this.on("pages", this.parsepages);
    this.on("home", this.home);
  };

  call(params) {
    if (params.pages) {
      this.pages = params.pages;
    }
    logger.info("Parameters call engine", params);

    this.request({
      url: "https://www.leroymerlin.fr",
      origin: params
    }, 'home');
  };

  home(html, req) {
    logger.debug("Home view: ", this.pages !== undefined && this.pages.length > 0);
    if (req.origin) {
      req = req.origin;
    }
    if (this.pages !== undefined && this.pages.length > 0) {
      this.aspireOnStore(req);
    } else {
      this.getpages(req);
    }
  };

  getpages(params) {
    this.request({
      url: "https://www.leroymerlin.fr/v3/p/magasins-l1308220543",
      origin: params
    },
      "pages");
  };

  parsepages(html, req, response) {
    this.logger.info("Rentré dans LeroyMerlin_MagasinList");
    var that = this;
    var $ = cheerio.load(html);
    that.pages = [];

    $(".notvisible a").each(function (idx) {
      var url = $(this).attr('href');
      var Magasin = $(this).text().trim();
      var MagasinId = $(this).attr('data-storeid');
      that.pages.push({
        name: Magasin,
        id: MagasinId
      });
    });
    this.aspireOnStore(req.origin);
  };

  aspireOnStore(req) {
    var that = this;
    req.pages = this.pages;
    async.eachLimit(this.pages, this.config.parallel, function (magasin, next) {
      var param = _.clone(req);
      param.magasin = magasin;
      param.cookies = {
        "store": "store=" + magasin.id
      };
      that.request(param, next);
    });
  };

  decode(html, req) {
    this.logger.info('Product decode', req.origin ? req.origin : req.url, req.magasin.name);
    var $ = cheerio.load(html);
    var ReqObject = req;

    /* ------------------------------------------------------------------------ */
    // manage fail
    if ($('.errorPage').length > 0) {
      var output = {
        requestID: ReqObject.requestID,
        error: "produit non disponible",
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
    $('.breadcrumb li').each(function (i) {
      data.categories.push($(this).find('a').text().trim());
    });
    data.marque = $('.logo-marque.marque-top img').attr('alt');
    data.srcImage = $('.media.fRight #zoom-area img').first().attr('src');
    data.libelles = [];
    data.libelles.push($('.showcase-product h1').text().trim());
    data.idProduit = $('.showcase-product').attr('data-prd-id');
    data.prix = $('p.price').first().text().trim();
    var verif = $('span[class="picto-marque promo"]').first().text();
    if (verif && verif.length > 0) {
      data.ancienPrix = $('p.infos em.barred em').first().text().trim();
      data.promoDirecte = $('.picto-marque.promo').first().text().trim();
    }
    data.promo = data.ancienPrix ? 1 : 0;
    data.ean = html.split('product_ean :')[1].split(',')[0].replace(/'/g, '');

    this.logger.debug("Price: ", data.libelles, data.prix);

    var output = {
      requestID: req.requestID,
      data: data,
      pages: this.pages
    };

    this.emit('product', output);
  }
}
module.exports = LeroyMerlin;
