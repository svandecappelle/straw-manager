var Engine = require('../engine/engine'),
  cheerio = require('cheerio'),
  _ = require('underscore');

class Example extends Engine {

  constructor(use_proxy) {
    super();
    this.name = "Example";
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
      url: "https://www.Example.fr",
      origin: params
    }, 'home');
  };

  home(html, req) {
    logger.info("Home view: ", this.pages !== undefined && this.pages.length > 0);
    if (req.origin) {
      req = req.origin
    }
    if (this.pages !== undefined && this.pages.length > 0) {
      this.aspireOnStore(req);
    } else {
      this.getpages(req);
    }
  };

  getpages(params) {
    this.request({
      url: "https://www.Example.fr/nos-magasins.html",
      origin: params
    },
      "pages");
  };

  aspireOnStore(req) {
    var that = this;
    req.pages = this.pages;
    _.each(this.pages, function (id) {
      var param = _.clone(req);
      param.MagasinId = id;
      param.cookies = {
        'smile_retailershop_id': id
      };
      logger.info("Example_MagasinList", id);
      that.request(param);
    });
  };

  parsepages(html, req, response) {
    var that = this;
    logger.info(response.cookies);
    // console.log(html);
    var $ = cheerio.load(html);
    that.pages = [];
    logger.info("Rentré dans Example_MagasinList");

    $("[id='shop_chooser'] option").each(function (idx) {
      var url = $(this).attr('value')
      var Magasin = $(this).text().trim()
      var MagasinId = $(this).attr('data-shop-id')

      logger.debug(Magasin, url, MagasinId)
      that.pages.push(MagasinId);
    });

    logger.debug("Example_MagasinList", this.pages);

    this.aspireOnStore(req.origin);
  };

  decode(html, req) {
    var $ = cheerio.load(html);
    logger.debug('*********Fiche**************', req);
    var ReqObject = req;

    /* ------------------------------------------------------------------------ */
    // manage fail
    if ($('.std .top-content').text().trim() == "Produit non disponible") {
      var output = {
        requestID: ReqObject.requestID,
        error: "produit non disponible",
        data: undefined
      };
      return this.emit('fatal_error', { 'message': output.error }, output);
    }

    var output = {
      requestID: req.requestID,
      data: data
    };
    this.emit('product', output);
  }

}

module.exports = Example
