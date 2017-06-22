var fs = require('fs'),
  path = require('path'),
  events = require('events'),
  fastcsv = require('fast-csv'),
  _ = require('underscore'),
  camelize = require("underscore.string/camelize"),
  moment = require('moment');

var export_scheme = {
  enseigne: "",
  magasin: "",
  id_produit: "",
  url: "",
  src_image: "",
  libelles: "",
  categories: "",
  dispo: "",
  prix: "",
  prix_normalise: "",
  timestamp: "",
  promo: "",
  caracteristique: ""
}

function Exporter() {

  events.EventEmitter.call(this);

  this.file_descriptors = {};
  this.data = {};
  this.listen();
  this.on('write', this.onWrite);
}

Exporter.prototype.__proto__ = events.EventEmitter.prototype;

Exporter.prototype.listen = function () {

  _.each(this.file_descriptors, (fd, enseigne) => {
    if (_.isEmpty(this.data[enseigne])) {
      if (fd.isOpen){
          fd.close();
      }
    } else {
      setTimeout(this.listen, 1000);
    }
  });

};

Exporter.prototype.onWrite = function () {
  _.each(this.data, (rows_data, enseigne) => {
    if (!this.file_descriptors[enseigne] || !this.file_descriptors[enseigne].isOpen){
      this.open(_.first(rows_data));
    }

    _.each(rows_data, (row) => {
      if (!row.isExported){
        row.isExported = true;
        this.file_descriptors[enseigne].stream.write(row);
      }
    });
  });
};

Exporter.prototype.open = function (data) {
  var csvStream = fastcsv.createWriteStream({
      headers: true,
      delimiter: ';'
    })
    .transform(function(data){
      var output = {};
      _.each(export_scheme, function(value, key){
        if (data[camelize(key)]){
          output[key] = data[camelize(key)];
        } else {
          output[key] = value;
        }
      });
      output.magasin = data.magasin.id;
      return output;
    }),
    writableStream = fs.createWriteStream(this.filename(data.enseigne), {
    flags: 'a'
  });
  writableStream.on("close", function(){
    console.log('closed output file'.green);
    file_descriptors[enseigne].isOpen = false;
  });
  writableStream.on("finish", function(){
    console.log("DONE!".green);
  });
  csvStream.pipe(writableStream);
  this.file_descriptors[data.enseigne] = {
    stream: csvStream,
    isOpen: true,
    enseigne: data.enseigne,
    close: function(){
      console.log("Closing export file");
      csvStream.end();
      writableStream.close();
    }
  };
};

Exporter.prototype.filename = function(enseigne){
  return path.join(__dirname, `../../../export/${enseigne}-${moment().locale('fr').format('DD-MM-YYYY')}.csv`);
}

Exporter.prototype.export = function (data) {
  if (this.data[data.enseigne] === undefined){
    this.data[data.enseigne] = [];
  }
  this.data[data.enseigne].push(data);
  this.emit('write');
};

module.exports = Exporter;
