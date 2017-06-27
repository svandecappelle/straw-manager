#!/usr/bin/env node

var qmaker = require("qmaker"),
  path = require('path'),
  fs = require('fs'),
  _ = require("underscore"),
  nconf = require("nconf"),
  jsonfile = require('jsonfile'),
  transform = require('stream-transform'),
  moment = require('moment'),
  argv = require("argv"),
  configFile = __dirname + '/config.yml';

argv.version("1.0");
argv.option({
   name: 'output',
   short: 'o',
   type: 'path',
   description: 'batch output JSON file'
});
var args = argv.run();

nconf.argv().env();
if (nconf.get('config')) {
  configFile = path.resolve(__dirname, nconf.get('config'));
}

nconf.file({
  file: configFile,
  format: require('nconf-yaml')
});

nconf.defaults({
  base_dir: __dirname
});

var database = require("./database");

database.on("ready", function(){

  var query = fs.readFileSync(path.resolve(__dirname,'./queries/user-alarms.sql'), 'utf8');

  database.execute(query, (err, results) => {
    var file;
    if (args.options.output){
      file = args.options.output;
    } else {
      file = `data-${moment().locale('fr').format('DD-MM-YYYY hh:mm:ss')}.json`;
    }
    if (err){
      return console.error(query.toString(), err);
    }

    transform(results.rows, (data) => {
      return {
        'idProduit': data[0],
        'Enseigne': data[1],
        'url': data[2],
        'idLogique': data[3]
      };
    }, (err, output) => {
      jsonfile.writeFile(file, {
        "valids": output
      }, (err) => {
        if (err){
          console.error(err);
        }
      })

    });
  });
});
