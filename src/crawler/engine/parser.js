const cheerio = require('cheerio');
const async = require('async');
const _ = require('underscore');

class Parser {

  constructor(opts) {
    this.opts = opts;
    this.opts = {
      rules: []
    }
  }

  configure(opts) {
    let rules = _.compact(_.map(opts.parameters, (value, param) => {
      if (param.indexOf("rule-") === 0){
        return value;
      }
      return null;
    }));
    this.opts.rules = _.values(rules);
  }

  parse(input) {
    let $ = cheerio.load(input);
    return new Promise((resolve, reject) => {
      if (this.opts.rules) {
        async.mapLimit(this.opts.rules, 5, (rule, next) => {
          let matchedValues = {};
          matchedValues[rule] = $(rule).map((i, match) => {
            return $.html(match);
          }).get();

          next(null, matchedValues);
        }, (err, parsedValues) => {
          if (!err) {
            resolve(parsedValues);
          } else {
            reject(err);
          }
        });
      }
    });
  }
}

module.exports = new Parser();