var Engine = require('../engine/engine'),
  async = require('async'),
  htmlToText = require('html-to-text'),
  cheerio = require('cheerio'),
  log4js = require("log4js"),
  _ = require('underscore');

class Ovh extends Engine {

  constructor(use_proxy) {
    super("ovh");
    this.use_proxy = use_proxy;
    this.on("page", this.decode);
    this.on("home", this.home);
  }

  call(params) {
    if (params.pages) {
      this.pages = params.pages;
    } else {
      this.pages = []      
    }

    this.logger.info("Parameters call engine", params);

    this.request({
      url: "https://www.ovh.com",
      origin: params
    }, 'home');
  };

  home(html, req, response) {
    this.logger.debug("Home view: ", this.pages !== undefined && this.pages.length > 0);
    if (req.origin) {
      req = req.origin
    }
    var $ = cheerio.load(html);

    let all_pages = $("a").map( (i, el) => { return $(el).attr("href") } ).get();

    this.pages = _.filter( all_pages, (href) => {
      return href.indexOf('ovh.com') !== -1 || href.charAt(0) === '/';
    });

    this.pages.push("https://ovh.com");
    this.pages = _.map( this.pages, (href) => {
      if (href.charAt(0) === '/'){
        href = "https://ovh.com".concat(href);
      }
      this.logger.info(href);
      return href;
    })

    this.decode(html, req, response);
    async.eachLimit(this.pages, 10, (page, next) => {
      // this.logger.info('call', page);
      this.request({
        url: page,
        origin: req,
        requestID: req.requestID
      }, next);
    });
  };

  decode(html, req, response) {
    var $ = cheerio.load(html);
    var output = {
      requestID: req.requestID,
      pages: this.pages,
      data: {
          enseigne: 'ovh',
          url: req.url,
          page: {
            id: req.url,
            title: $("title").text(),
            status: response.statusCode
          },
          libelles: [$("title").text()],
          status: response.statusCode,
          timestamp: new Date()
      }
    };
    this.emit('product', output, req);
    // this.emit('done', req);
  };

};

module.exports = Ovh
