var fs = require('fs'),
  path = require('path'),
  logger = require('log4js').getLogger('Exporter'),
  events = require('events'),
  fastcsv = require('fast-csv'),
  _ = require('underscore'),
  camelize = require("underscore.string/camelize"),
  moment = require('moment');

const TIME_TO_CLOSE_FILE = 3000;

var export_scheme = {
  enseigne: "",
  magasin: "",
  id_produit: "",
  id_logique: "",
  url: "",
  src_image: "",
  libelles: "",
  categories: "",
  dispo: "",
  prix: "",
  prix_normalise: "",
  timestamp: "",
  promo: "",
  caracteristique: "",
}

function Exporter() {

  events.EventEmitter.call(this);

  this.file_descriptors = {};
  this.data = {};
  this.listen();
  // this.on('write', this.onWrite);
}

Exporter.prototype.__proto__ = events.EventEmitter.prototype;

Exporter.prototype.listen = function () {
  var that = this;
  _.each(that.file_descriptors, (fd, enseigne) => {
    if (fd.isOpen) {
      if (_.isEmpty(_.where(that.data[enseigne], {isExported: false}))) {
        fd.close();
      }
    }
  });

  try {
    _.each(that.data, (rows_data, enseigne) => {
      if (rows_data !== undefined && rows_data.length > 0 && enseigne){
        if (!that.file_descriptors[enseigne] || !that.file_descriptors[enseigne].isOpen){
          logger.info("########################### Open FILE ############################", _.first(rows_data).enseigne);
          that.open(_.first(rows_data));
        }

        _.each(rows_data, (row) => {
          if (!row.isExported && that.file_descriptors[enseigne]){
            logger.debug("########################### Exporting ############################", row);

              that.file_descriptors[enseigne].stream.write(row);
              row.isExported = true;

          }
        });
      }
    });
  } catch (err) {
    logger.warn("Writting on file after close", err);
  }
  
  setTimeout(function(){
    that.listen();
  }, TIME_TO_CLOSE_FILE);
};

Exporter.prototype.open = function (data) {
  var file = this.filename(data.enseigne);

  var that = this;
  if (!fs.existsSync(file)){
    fs.appendFileSync(file, _.keys(export_scheme).join(";") + '\r\n');
  }
  var csvStream = fastcsv.format({
      headers: false,
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
      output.timestamp = output.timestamp.getTime();
      return output;
    }),
    writableStream = fs.createWriteStream(file, {
      flags: 'a'
    });
  writableStream.on("close", function(){
    logger.info('closed output file'.green);
    that.data[data.enseigne] = _.where(that.data[data.enseigne], {isExported: false});

    that.file_descriptors[data.enseigne].isOpen = false;
  });
  writableStream.on("finish", function(){
    logger.info("DONE!".green);
  });
  csvStream.pipe(writableStream);

  this.file_descriptors[data.enseigne] = {
    stream: csvStream,
    isOpen: true,
    enseigne: data.enseigne,
    close: function(){
      logger.info("Closing export file");
      csvStream.end();
      writableStream.close();
      fs.appendFileSync(file, '\r\n');
    }
  };
};

Exporter.prototype.filename = function(enseigne){
  return path.join(__dirname, `../../../export/${enseigne}-${moment().locale('fr').format('DD-MM-YYYY')}.csv`);
}

Exporter.prototype.export = function (data) {
  if (data.enseigne){
    if (this.data[data.enseigne] === undefined){
      this.data[data.enseigne] = [];
    }
    data.isExported = false;
    this.data[data.enseigne].push(data);
  } else {
    logger.warn("WARN: an export request is about undefined Enseigne type".yellow.bold, data);
  }
};

module.exports = Exporter;
