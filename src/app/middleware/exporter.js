var fs = require('fs'),
  path = require('path'),
  nconf = require('nconf'),
  logger = require('log4js').getLogger('Exporter'),
  events = require('events'),
  fastcsv = require('fast-csv'),
  _ = require('underscore'),
  camelize = require("underscore.string/camelize"),
  moment = require('moment');

const ignoreFields = ['page'];
const TIME_TO_CLOSE_FILE = 3000;

class Exporter extends events.EventEmitter {

  constructor () {
    super();
    this.file_descriptors = {};
    this.data = {};
    this.listen();
  }

  listen() {
    _.each(this.file_descriptors, (fd, enseigne) => {
      if (fd.isOpen) {
        if (_.isEmpty(_.where(this.data[enseigne], { isExported: false }))) {
          logger.debug("########################### Flushing write ############################");
          fd.close();
        }
      }
    });

    try {
      _.each(this.data, (rows_data, enseigne) => {
        if (rows_data !== undefined && rows_data.length > 0 && enseigne) {
          if (!this.file_descriptors[enseigne] || !this.file_descriptors[enseigne].isOpen) {
            logger.debug("########################### Open FILE ############################", _.first(rows_data).enseigne);
            this.open(_.first(rows_data));
          }

          _.each(rows_data, (row) => {
            if (!row.isExported && this.file_descriptors[enseigne]) {
              logger.debug("########################### Exporting ############################", row);
              this.file_descriptors[enseigne].stream.write(row);

              row.isExported = true;
            }
          });
        }
      });
    } catch (err) {
      logger.warn("Writting on file after close", err);
    }

    setTimeout(() => {
      this.listen();
    }, TIME_TO_CLOSE_FILE);
  };

  open(data) {
    var file = this.filename(data.enseigne);

    if (!fs.existsSync(file)) {
      fs.appendFileSync(file, _.keys(data).join(";") + '\r\n');
    }
    var csvStream = fastcsv.format({
      headers: false,
      delimiter: ';'
    }),
      writableStream = fs.createWriteStream(file, {
        flags: 'a'
      });
    writableStream.on("close", () => {
      logger.debug('closed output file'.green);
      this.data[data.enseigne] = _.where(this.data[data.enseigne], { isExported: false });

      this.file_descriptors[data.enseigne].isOpen = false;
    });
    writableStream.on("finish", () => {
      logger.debug("DONE!".green);
    });
    csvStream.pipe(writableStream);

    this.file_descriptors[data.enseigne] = {
      stream: csvStream,
      isOpen: true,
      enseigne: data.enseigne,
      close: () => {
        logger.info("Flush export");
        csvStream.end();
        writableStream.close();
        fs.appendFileSync(file, '\r\n');
      }
    };
  };

  filename(enseigne) {
    if (nconf.get("export_folder")) {
      return path.join(__dirname, `../../../../${nconf.get("export-folder")}/${enseigne}-${moment().locale('fr').format('DD-MM-YYYY')}.csv`);
    } else {
      return path.join(__dirname, `../../../export/${enseigne}-${moment().locale('fr').format('DD-MM-YYYY')}.csv`);
    }
  }

  export(data) {
    if (data.enseigne) {
      if (this.data[data.enseigne] === undefined) {
        this.data[data.enseigne] = [];
      }
      data.isExported = false;
      this.data[data.enseigne].push(_.omit(data, ignoreFields));
    } else {
      logger.warn("WARN: an export request is about undefined Enseigne type".yellow.bold, data);
    }
  };

}

module.exports = new Exporter();
