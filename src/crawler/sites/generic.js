const Engine = require('../engine/engine');
const async = require('async');
const path = require('path');
const htmlToText = require('html-to-text');
const log4js = require("log4js");
const fs = require('fs');
const _ = require('lodash');
const qfgets = require('qfgets');
const child_process = require('child_process');
const tmp = require('tmp');

const { URL } = require('url');

class Generic extends Engine {

  constructor(use_proxy, name) {
    super(name);
    this.cancelled = false;
    this.use_proxy = use_proxy;
    this.on("page", this.decode);
    this.on("home", this.home);
    this.on("stop", this.stop);
  }

  stop(){
    this.cancelled = true;
    this.other_loop = [];
    this.pages = [];
  }

  call (request) {
    try {
      this.configure(request.parameters);
      request.parameters = this.config;
      this.params = this.config;
      this.params.url = request.url;

      if (request.parameters.pages) {
        this.pages = request.parameters.pages;
      } else {
        this.pages = [];
        this.other_loop = [];
        this.loopCounter = 0;
        this.from = {};
      }

      this.logger.debug("Parameters call engine", request);
      if (this.params["change-wait"] === "on" && this.params.wait && this.params.wait > -1) {
        this.config.wait = this.params.wait;
      }

      this.request({
        url: request.url,
        origin: request
      }, 'home');
    } catch (error) {
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

  getNotAlreadyDone ( filename, currentLoopFile, done ) {
    // Keep only left side no present in right side
    if (!fs.existsSync(filename)){
      return done(this.other_loop);
    } else { 
      let cmd = `comm --nocheck-order -23 <(sort ${currentLoopFile}) <(sort ${filename})`;
      this.logger.info(cmd);
      let child = child_process.exec(cmd, {shell: "/bin/bash", maxBuffer: 1024 * 1024 * 5}, (error, stdout, stderr) => {
        if (error) {
          this.logger.error(error);
        }
        // console.log(`stdout: ${stdout}`);
      });
      let lines = "";
      child.stdout.on("data", (data) => {
        lines += data.toString();
      });
      child.on('close', (code) => {
        lines = lines.split("\n");
        lines = _.filter(lines, (line) => {
          return line !== "";
        })
        lines = _.uniq(lines);
        this.logger.info(`to request: ${lines.length}`);
        done(lines);
      });
    }
  }

  loop (req) {
    if (this.cancelled) {
      this.logger.info(`Cancelled all datas crawl ${req.requestID}`.orange);
      if (!req.parameters) {
        req.parameters = this.params;
      }
      
      return this.emit('done', req);
    }
    this.loopCounter += 1;
    let current_loop = this.pages;
    this.logger.info(`${this.loopCounter} - Fetching ${current_loop.length} pages`);

    async.eachLimit(current_loop, this.config.parallel, (page, next) => {
      if (!this.cancelled) {
        this.request({
          url: page.href,
          data: page,
          origin: req,
          from: this.from[req.url],
          requestID: req.requestID
        }, next);
      } else {
        current_loop = [];
      }
    }, () => {
      // all pages in page retrieved
      if ( !_.isEmpty(this.other_loop)) {
        var file = path.resolve(__dirname, `../../../requests/req-${req.requestID}.req`);

        tmp.file({postfix: '.csv'}, (err, path, fd, cleanupCallback) => {
          if (err) throw err;
          
          // Create temp file of current loop to diff between alreay done on request
          console.log("File: ", path);
          console.log("Filedescriptor: ", fd);
          this.other_loop = _.uniqBy(this.other_loop, 'href');

          _.each(this.other_loop, (element) => {
            fs.writeSync(fd, element.href.concat("\n"));            
          });
          
          this.getNotAlreadyDone(file, path, ( results ) => {
            
            // this.logger.warn(this.other_loop);
            var loopUrls = _.map(results, (page) => {
              // this.logger.info({'href': page});
              let obj;
              if (page.href) {
                obj = _.find(this.other_loop, { 'href': page.href });
              } else if (_.isString(page)) {
                obj =  _.find(this.other_loop, {'href': page});
              } else {
                return undefined;
              }
              if (obj) {
                fs.appendFileSync(file, obj.href.concat("\n"));  
              }
              return obj;
            });

            this.other_loop = _.filter(loopUrls, (page) => {
              return page !== undefined;
            });

            this.logger.info(`${this.loopCounter} - Add ${results.length} requests found and not already crawled`);
            this.pages = this.other_loop;
            this.other_loop = [];
            this.loop(req);  
          });
        });
        
      } else {
        this.logger.info(`Done all datas crawl ${req.requestID}`.green);
        if (!req.parameters) {
          req.parameters = this.params;
        }
        this.emit('done', req);
      }
    });
  }

  fetchPages(html, req) {
    let all_pages = [];
    let re = /<a[^>]+href=['"]([^'"]+)['"][^>]*>(([^<]+)|.*?(?=(<\/a>)+))/g;

    let group;
    // <a> balises
    do {
      html = html.toString().replace(/(\r\n|\n\r|\n|\r)/g, "");
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
        // this.logger.info(url);
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
    var counter = 0;
    _.each(all_pages, (page) => {
      if (page.href.charAt(0) === '/') {
        let startPage = new URL(this.params.url)
        page.href = startPage.origin.concat(page.href);
      }
      
      if (this.valid(page.href)) {
        
        if (_.findIndex(this.pages, { href: page.href }) == -1 ) {
          page.id = this.pages.length + counter;
          this.other_loop.push(page);
          this.from[page.href] = req.url;
          counter += 1;
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

    if (!req.data) {
      req.data = {
        id: 0,
        name: '',
        line: undefined
      }
    }

    let exportFields = ["title", "name", "from"];
    let pageData = {
      id: req.data.id ? req.data.id : 0,
      url: req.url,
      title: page_title ? page_title.trim() : req.url,
      name: req.data.name ? req.data.name.trim() : "",
      line: req.data.line ? req.data.line : "",
      status: response.statusCode,
      from: this.from[req.url] ? this.from[req.url] : ""
    };
    let requestDatas = {
      enseigne: startPage.hostname,
      parameters: this.config,
      url: req.url,
      page: pageData,
      status: response.statusCode,
      timestamp: new Date()
    };

    requestDatas = _.extend(requestDatas, _.pick(pageData, exportFields));

    var output = _.extend(_.omit(req, ['origin']), {
      parameters: this.params,
      data: requestDatas
    });

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
