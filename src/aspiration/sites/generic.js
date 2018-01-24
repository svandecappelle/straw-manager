const Engine = require('../engine/engine');
const async = require('async');
const path = require('path');
const htmlToText = require('html-to-text');
const log4js = require("log4js");
const _ = require('underscore');
const { URL } = require('url');

class Generic extends Engine {

  constructor(use_proxy, name) {
    super(name);
    this.use_proxy = use_proxy;
    this.on("page", this.decode);
    this.on("home", this.home);
  }

  call(params) {
    this.params = params;
    if (params.pages) {
      this.pages = params.pages;
    } else {
      this.pages = [];
      this.done = [];
      this.other_loop = [];
      this.loopCounter = 0;
      this.from = {};
      this.pages.push(params.url);
    }

    this.logger.info("Parameters call engine", params);

    this.request({
      url: params.url,
      origin: params
    }, 'home');
  };

  home(html, req, response) {
    this.logger.debug("Start view: ", this.pages !== undefined && this.pages.length > 0);
    if (req.origin) {
      req = req.origin
    }
    if (this.params['only-one-page'] === "on") {
      return this.decode(html, req, response);
    } else {
      this.fetchPages(html, req);
      this.decode(html, req, response);
      this.loop(req);
    }
  };

  loop (req) {
    this.loopCounter += 1;
    let current_loop = _.difference(this.pages, this.done);
    this.logger.info(`${this.loopCounter} - Fetching ${current_loop.length} pages`);

    async.eachLimit(current_loop, this.config.parallel, (page, next) => {
      this.request({
        url: page,
        origin: req,
        from: this.from[req.url],
        requestID: req.requestID
      }, next);

    }, () => {
      this.done = this.pages;
      // all pages in page retrieved
      if ( !_.isEmpty(this.other_loop) ){
        this.logger.info(`${this.loopCounter} - Add ${this.other_loop.length} requests found`);

        this.pages = _.union(this.pages, this.other_loop);
        this.other_loop = [];
        this.loop(req);
      } else {
        this.logger.info(`Done all datas aspiration ${req.requestID}`.green);
        this.emit('done', req);
      }
    });
  }

  fetchPages(html, req) {
    let all_pages = [];
    let re = /<a[^>]+href=["|']([^"']+)/g;
    let group;
    do {
      group = re.exec(html);
      if (group) {
        all_pages.push(group[1]);
      }
    } while (group)
    
    all_pages = _.filter(all_pages, (href) => {
      let valid;
      let startPage = new URL(this.params.url)

      if (this.params['only-children'] === "on"){
        if (href.charAt(0) === '/'){
          startPage = new URL(this.params.url);
          href = startPage.origin.concat(href);
        }
        if (href.match("^http")) {
          let curPage = new URL(href);
          if (curPage.hostname === startPage.hostname) {
            return href.indexOf(startPage.pathname) !== -1;
          }
          valid = href.indexOf(startPage.hostname) === 0 && href.indexOf(startPage.pathname) !== -1;
        } else {
          valid = href.indexOf(startPage.hostname) !== -1 && href.indexOf(startPage.pathname) !== -1;          
        }
      } else {
        startPage = new URL(this.params.url);
        valid = (href.indexOf(startPage.hostname) !== -1 || href.charAt(0) === '/') && href.substring(0,1) !== "//";
      }

      return valid;
    });

    _.each(all_pages, (href) => {
      if (href.charAt(0) === '/') {
        let startPage = new URL(this.params.url)
        href = startPage.origin.concat(href);
      }

      if (this.valid(href)) {
        if (!_.contains(this.pages, href)) {
          this.other_loop.push(href);
          this.from[href] = req.url;
        }
      }
    });
  }

  valid (href) {
    let ignore = [
      ".jpg",
      ".jpeg",
      ".png",
      ".pdf",
      ".gif",
      ".cgi"
    ];
    let valid = !_.contains(ignore, path.extname(href));

    if (this.params['regxp-validation']) {
      this.logger.info(this.params['regxp-validation']);
      valid = valid && href.match(this.params['regxp-validation']) != null;
      if (valid){
        this.logger.info("Text regxp href: " + href + " ---> " + href.match(this.params['regxp-validation']));
      } else {
        this.logger.info("Filtered href: " + href);
      }
      return valid;
    }

    return valid;
  }

  decode(html, req, response, redirect) {
    if (redirect) {
      if (redirect.indexOf(this.params.url) !== -1 ) {
        this.logger.debug(`Ignore ${req.url} redirected on: ${redirect}`);  
        // keep on hostname site
        this.fetchPages(html, req);  
      }
    } else {
      this.fetchPages(html, req);
    }
    let re = /<title>([^<]+)/g;
    let title;
    let page_title;
    do {
      title = re.exec(html);
      if (title) {
        page_title = title[1];
      }
    } while (title)

    let startPage = new URL(this.params.url);

    var output = {
      requestID: req.requestID,
      pages: this.pages,
      data: {
        enseigne: startPage.hostname,
        url: req.url,
        config: this.config,
        page: {
          id: req.url,
          title: page_title ? page_title : req.url,
          status: response.statusCode,
          from: this.from[req.url]
        },
        libelles: title,
        status: response.statusCode,
        timestamp: new Date()
      }
    };

    if (this.params['keep-errors-only'] === "on") {
      if (response.statusCode >= 400 || response.statusCode === 310){
        this.emit('product', output, req); 
      }
      return;
    }
    this.emit('product', output, req);
  };

};

module.exports = Generic
