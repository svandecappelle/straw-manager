const _ = require('underscore');
const nconf = require('nconf');
const events = require('events');
const async = require('async');
const logger = require('log4js').getLogger('Buffer');
const aspiration = require('./../../aspiration/interface');
const Exporter = new require('./../middleware/exporter');
const datastore = require("../middleware/datastore");

const aspired_pages = {};

if (!('toJSON' in Error.prototype)){
  Object.defineProperty(Error.prototype, 'toJSON', {
      value: function () {
          var alt = {};

          Object.getOwnPropertyNames(this).forEach(function (key) {
              alt[key] = this[key];
          }, this);

          return alt;
      },
      configurable: true,
      writable: true
  });
}

const SHOPS_PROPERTIES = ['magasin', 'prix', 'prixUnite', 'promo', 'promoDirecte', 'dispo', 'url'];

var requestBuffer = [];
var aspirations = {};
var auto_increment = -1;
var exporter = new Exporter();

class Buffer extends events.EventEmitter {

  constructor () {
    super();
    datastore.get("requests")
    .catch(() => {
      datastore.store("requests", "[]");
    });

    this.on('done', (results) => {
      logger.info("Aspiration done".cyan.bold, results.requestID);
      var mem = process.memoryUsage();
      logger.info("Memory used: ", mem.heapUsed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "));
      if (mem.heapUsed > nconf.get("max-memory") * 1000 * 1000){
        // 1Go clear memory
        logger.warn('flush memory to prevent memory leaks');
        this.flush();
      }

      var reqId = results.requestID;

      datastore.get(`request:${reqId}`)
      .then( (request) => {
        request = JSON.parse(request);
        request.responseDate = Date.now();

        if (request.status !== 'timeout' && request.status !== 'error' && request.status !== 'partial_pending') {
          request.status = 'set';
        } else if (request.status !== 'timeout' && request.status !== 'error'){
          request.status = 'partial_done';
        }

        datastore.store(`request:${reqId}`, JSON.stringify(request))
      });
    });
  
    this.on('product', (results) => {
      logger.debug("Aspiration of one product".cyan.bold, results.requestID);
      this.export(results);
    });
  
    this.on('not_found', (results) => {
      logger.info("Aspiration of one product is partial because of not found on a store".cyan.bold, results.requestID);
      this.export(results);
    });
  
    this.on('timeout', (error, req) => {
      this.error(req, 'timeout', error);
    });
    this.on('error', (error, req) => {
      this.error(req, 'failed', error);
    });
  }

  error (req, status, error) {
    if (req.origin) {
      req = req.origin;
    }
    logger.error(`${status} on aspiration`.red, error, _.omit(req, ["aspired_pages", "pages", "pages_detail"]));
    this.update(req);

    var index = _.findIndex(requestBuffer, {requestID : Number.parseInt(req.requestID)})
    if (index > -1) {
      requestBuffer[index].error = error;
      requestBuffer[index].status = status;
      if (requestBuffer[index].callback){
        requestBuffer[index].callback(requestBuffer[index]);
      }
    }
  }
  
  export (results) {
    if (results.parameters.export === true || results.parameters.export === "on") {
      exporter.export(results.data);
    }
    results = this.update(results, false);
    
    let dataColumns = ["status"];
    if (results.data.page) {
      dataColumns = _.keys(results.data.page);
    }

    aspired_pages[results.requestID] += 1;
    var nbaspired_pages = aspired_pages[results.requestID];
    if (results.data.page) {
      results.data.page.id = nbaspired_pages;
    }

    datastore.batch()
    .put("last-request", results.requestID)
    .put(`request:${results.requestID}:nbaspired`, "" + nbaspired_pages)
    .put(`request:${results.requestID}:datas`, JSON.stringify(_.omit(results.data, ['page'])))
    .put(`request:${results.requestID}:columns`, dataColumns)
    .write( () => {
      if (results.data.page) {
        datastore.store(`request:${results.requestID}:page:${results.data.page.id}`, JSON.stringify(results.data.page))
        .then( () => {
        }).catch( (err) => {
          logger.error(err);
        });
      } else {
        logger.warn("no page data page", results.data);
      }
    });
  }

  flush (type) {
    if (!type){
      requestBuffer = _.filter(requestBuffer, (elem) => {
          return elem.status === 'failed' || elem.status === 'pending' || elem.status === 'partial_pending';
      });

    } else if (type !== 'all'){
      logger.info(`flush memory on '${type}'`);
      requestBuffer = _.filter(requestBuffer, (elem) => {
        return elem.status !== 'partial_'.concat(type) && elem.status !== type;
      });

    } else {
      logger.info(`flush all memory`);
      requestBuffer = [];
    }

    var mem = process.memoryUsage();
    logger.info("Memory used: ", mem.heapUsed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "));
  };

  pending_length () {
    return this.pending().length;
  };

  pending (){
    return _.union(_.where(requestBuffer, {status: 'pending'}), _.where(requestBuffer, {status: 'partial_pending'}));
  };

  failed () {
    return _.union(_.where(requestBuffer, {status: 'failed'}), _.where(requestBuffer, {status: 'timeout'}));
  };

  aspired () {
    return _.union(_.where(requestBuffer, {status: 'set'}), _.where(requestBuffer, {status: 'partial_done'}));
  };

  search (query) {
    return _.filter(requestBuffer, (elem) => {
      return JSON.stringify(elem).indexOf(query) !== -1;
    });
  }

  stop (id) {
    if (aspirations[id]){
      aspirations[id].stop();
    }
    datastore.get(`request:${id}`)
    .then( (request) => {
      request = JSON.parse(request);
      request.responseDate = Date.now();
      request.status = 'cancelled';
      datastore.store(`request:${id}`, JSON.stringify(request))
    });
  }

  add (request, callback) {
    auto_increment++;
    
    return new Promise((resolve, reject) => {
      if (request) {
        datastore.get("requests")
        .then( (requests) => {
          requests = JSON.parse(requests);

          request = _.extend({
            requestID     : requests.length,
            enseigne      : null,
            requestDate   : Date.now(),
            responseDate  : null,
            url           : request.url,
            status        : 'pending',
            data          : {}
          }, _.omit(request, ["requestID"]));
          aspired_pages[request.requestID] = 0;

          requests.push(request.requestID);
          datastore.batch()
          .put("requests", JSON.stringify(requests))
          .put(`request:${request.requestID}:nbaspired`, "0")
          .put(`request:${request.requestID}`, JSON.stringify(request))
          .write( () => {
            resolve(request);
            aspirations[request.requestID] = aspiration.launch(request, this);
          });

        }).catch( () => {
          // not any requests
          aspired_pages[request.requestID] = 0;
          
          request = _.extend({
            requestID     : 0,
            enseigne      : null,
            requestDate   : Date.now(),
            responseDate  : null,
            url           : request.url,
            status        : 'pending',
            data          : {}
          }, _.omit(request, ["requestID"]));
          datastore.batch()
          .put("requests", JSON.stringify([0]))
          .put(`request:${request.requestID}:nbaspired`, "0")
          .put(`request:${request.requestID}`, JSON.stringify(request))
          .write( () => {
            resolve(request);
            aspirations[request.requestID] = aspiration.launch(request, this);
          });
        });
        
      }
    });
  };

  update (request, error) {
    // update data, set status and responseDate
    
    if (request.origin) {
      request = req.origin;
    }

    request.responseDate = Date.now();
    
    if (error) {
      request.status = 'failed';
      if (!request.error && error) {
        request.error = JSON.stringify(error);
      } else if (request.error && error) {
        if (!Array.isArray(request.error)) {
          request.error = [request.error]
        }
        request.error.push(error);
      }
      
      logger.error(`Request: ${request.requestID} failed: `.red.bold.underline, request.error);
    }

    return request;
  };

  getElementByRequestID (object) {
    var nbRecordsByPage = 50;
    var pageNumberFilter = object.start ? object.start : 0;
    var activatePaging = object.start !== undefined;

    var promise = new Promise((resolve, reject) => {
      var request;
      datastore.get(`request:${Number.parseInt(object.requestID)}`)
      .then( (properties) => {
        // Request properties
        request = JSON.parse(properties);
        datastore.get(`request:${Number.parseInt(object.requestID)}:nbaspired`)
        .then( (nbaspired) => {
          nbaspired = JSON.parse(nbaspired);
          request.aspired_pages = nbaspired;

          datastore.get(`request:${Number.parseInt(object.requestID)}:datas`)
          .then( (requestStored) => {
            request.data = JSON.parse(requestStored);
            request.pages_detail = [];
            if (nbaspired > 0) {
              let nbRecordsToFetch = nbRecordsByPage;
              if (activatePaging) {
                if (pageNumberFilter + nbRecordsToFetch > nbaspired){
                  nbRecordsToFetch = nbaspired % nbRecordsToFetch
                }
              } else {
                nbRecordsToFetch = nbaspired;
              }
              async.timesLimit(nbRecordsToFetch, 10, (n, next) => {
                let start = (pageNumberFilter) + (n + 1);
                datastore.get(`request:${request.requestID}:page:${start}`)
                .then( (page) => {
                  request.pages_detail.push(JSON.parse(page));
                  next();
                });
              }, () => {
                resolve(request);
              });
              
            } else {
              resolve(request);
            }
          })
          .catch((err) => {
            logger.error(err);
            reject("Not found id on datas");
          });
        });
      });
    });

    return promise;
  };

  getBuffer () {
    return new Promise( (resolve, reject) => {
      datastore.get("requests")
      .then( (requests) => {
        requests = JSON.parse(requests);
        async.mapLimit(requests, 10, (request, next) => {
          datastore.get(`request:${request}`)
          .then( (value) => {
            value = JSON.parse(value)
            datastore.get(`request:${request}:nbaspired`)
            .then( (nbaspired) => {
              value.aspired_pages = JSON.parse(nbaspired);
              next(null, value);
            }).catch( (error) => {
              next(error);
            });
          })
          .catch( (error) => {
            logger.error(error);
            next(error);
          });
        }, (error, buffer) => {
          if (error) {
            reject(error);
          } else {
            resolve(buffer);
          }
        });
      })
      .catch( (error) => {
        logger.error(error);
        reject(error);
      });
    });
  }

  validQuery (query) {
    if (query && query.url) {
      return true
    } else {
      return false
    }
  };

  drop (id) {
    var index = _.findIndex(requestBuffer, {requestID : Number.parseInt(id)})
    if (  index > -1 ) {
      requestBuffer.splice(index, 1)
      return true
    } else {
      return false
    }
  };

}

module.exports = new Buffer();
