#!/usr/bin/env node

var qmaker = require("qmaker"),
  path = require('path'),
  fs = require('fs'),
  _ = require("underscore"),
  nconf = require("nconf"),
  jsonfile = require('jsonfile'),
  transform = require('stream-transform'),
  moment = require('moment'),
  configFile = __dirname + '/config.yml';

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

nconf.set("database", {
    "type"          : "oracle",
    "user"          : "LNK_BRICODEPOT",
    "password"      : "LNK_BRICODEPOT",
    "connectString" : "192.168.1.129/RECETTE",
    "master"        : "BricoDepot",
    "poolMax"       : 2,
    "poolMin"       : 1,
    "poolIncrement" : 1,
    "poolTimeout"   : 4
});

var database = require("./database");

database.on("ready", function(){
/*  var alarms = new qmaker.Query();
  alarms.select("ID_PRODUIT");
  alarms.select("LIEN_FICHEPRODUIT");
  alarms.select("LIBELLE").as("ENSEIGNE");

  alarms.from("USER_ALARMS");
  alarms.innerJoin("(SELECT LIEN_FICHEPRODUIT, ENSEIGNE.LIBELLE, ID FROM PRODUIT, ENSEIGNE) PRODUIT").on("PRODUIT.ID").equals("USER_ALARMS.ID_PRODUIT");
*/

  var query = fs.readFileSync(path.resolve(__dirname,'./queries/user-alarms.sql'), 'utf8');

  database.execute(query, (err, results) => {
    var file = `data-${moment().locale('fr').format('DD-MM-YYYY hh:mm:ss')}.json`;
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
