const Engine = require('../engine/engine');
const async = require('async');
const path = require('path');
const htmlToText = require('html-to-text');
const log4js = require("log4js");
const _ = require('lodash');
const { URL } = require('url');

class Generic extends Engine {

  constructor(use_proxy, name) {
    super(name);
    this.use_proxy = use_proxy;
    this.on("page", this.decode);
    this.on("home", this.home);
  }

  call(request) {
    try {
      this.params = request.parameters;
      this.params.url = request.url;

      if (request.parameters.pages) {
        this.pages = request.parameters.pages;
      } else {
        this.pages = [];
        this.done = [];
        this.other_loop = [];
        this.loopCounter = 0;
        this.from = {};
      }

      this.logger.info("Parameters call engine", request);
      if (this.params["change-wait"] === "on" && this.params.wait && this.params.wait > -1) {
        this.config.wait = this.params.wait;
      }

      this.request({
        url: request.url,
        origin: request
      }, 'home');
    } catch (error){
      return this.emit("fatal_error", error, request);
    }
  };

  home(html, req, response) {
    this.logger.debug("Start view: ", this.pages !== undefined && this.pages.length > 0);
    if (req.origin) {
      req = req.origin
    }
    if (this.params['only-one-page'] === "on") {
      this.decode(html, req, response);
      return this.emit('done', req);
    } else {
      this.fetchPages(html, req);
      this.decode(html, req, response);
      this.loop(req);
    }
  };

  loop (req) {
    this.loopCounter += 1;
    let current_loop = _.differenceBy(this.pages, this.done, 'href');
    this.logger.info(`${this.loopCounter} - Fetching ${current_loop.length} pages`);

    async.eachLimit(current_loop, this.config.parallel, (page, next) => {
      // this.logger.info(page);

      this.request({
        url: page.href,
        data: page,
        origin: req,
        from: this.from[req.url],
        requestID: req.requestID
      }, next);

    }, () => {
      // all pages in page retrieved
      if ( !_.isEmpty(this.other_loop) ){
        this.logger.info(`${this.loopCounter} - Add ${_.uniqBy(_.differenceBy(this.other_loop, this.done, 'href'), 'href').length} requests found`);

        this.pages = _.unionBy(this.pages, this.other_loop, 'href');
        this.other_loop = [];
        this.loop(req);
      } else {
        this.logger.info(`Done all datas aspiration ${req.requestID}`.green);
        if (!req.parameters) {
          req.parameters = this.params;
        }
        this.emit('done', req);
      }
    });
  }

  fetchPages(html, req) {
    let all_pages = [];
    let re = /<a[^>]+href=['"]([^'"]+)['"][^>]*>([^<]+)/g;

    let group;
    do {
      group = re.exec(html);
      if (group) {
        
        let linesFound = [];

        if (this.params.countlines === "on") {
          let lines = html.replace(/(\r\n|\n\r|\n|\r)/g, "\n").split("\n");
          let lineCounter = 0;
          let line;

          for (lineCounter = 0; lineCounter < lines.length ; lineCounter += 1) {
            line = lines[lineCounter];
            if (line.indexOf("=\"" + group[1] + "\"") !== -1) {
              linesFound.push(lineCounter + 1);
            }
          }
        } else {
          linesFound.push("Not activated");
        }

        let url = {
          href: group[1], // group[2] ? group[2] : group[1]
          name: group[2] ? group[2] : group[1],
          line: linesFound.join(", ")
        }
        all_pages.push(url);
      }
    } while (group)
    
    all_pages = _.filter(all_pages, (page) => {
      let href = page.href;
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

    _.each(all_pages, (page) => {
      if (page.href.charAt(0) === '/') {
        let startPage = new URL(this.params.url)
        page.href = startPage.origin.concat(page.href);
      }
      
      if (this.valid(page.href)) {
        
        if (_.findIndex(this.pages, { href: page.href }) == -1 ) {
          this.other_loop.push(page);
          this.from[page.href] = req.url;
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
    let valid = _.findIndex(ignore, path.extname(href)) == -1;

    if (this.params['regxp-validation']) {
      valid = valid && href.match(this.params['regxp-validation']) != null;
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
      parameters: this.params,
      data: {
        enseigne: startPage.hostname,
        url: req.url,
        config: this.config,
        page: {
          id: req.url,
          title: page_title ? page_title : req.url,
          name: req.data.name,
          line: req.data.line,
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
        this.emit('not_found', output, req);
      }
      return;
    }
    this.emit('product', output, req);
  };

};

module.exports = Generic
