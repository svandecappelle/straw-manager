/*!
 * Optimix Aspiration
 * Author: Gautier Fauchart <gautier.fauchart@gmail.com>
 * MIT Licensed
 */

var _ = require("lodash"),
  Q = require("q"),
  builder = require('xmlbuilder'),
  fs = require("fs"),
  _ = require("underscore"),
  cheerio = require("cheerio"),
  logger = require("log4js").getLogger("engine->config"),
  yaml_config = require('node-yaml-config');;
const path = require('path');

function Config(enseigne){

  /* CUSTOM GETTERS */
  function FileToArray(filename){
    var file = fs.readFileSync(filename).toString().replace(/\r/g, '');
    var array = file.split("\n");
    if (array[array.length - 1] == ""){
      array.splice(array.length - 1, 1);
    }
    array.sort(function() {return 0.5 - Math.random()})
    return array;
  }

  function GetUint(string){
    var uint = parseInt(string);
    if (isNaN(uint) || uint <= 0){
      console.warn("la config, contient un entier < 0");
      process.exit(1);
    }
    return uint;
  }

  function GetBool(string){
    if (string == "true" || string == "1") {
      return true;
    } else if (string == "false" || string == "0") {
      return false;
    } else {
      logger.error("la config, contient un mauvais boolean");
      process.exit(1);
    }
  }

  function GetEncoding(string){
    if (string == "ISO-8859-1" || string == "UTF-8" || string == "ISO-8859-15") {
      return string;
    } else {
      logger.error("ERREUR D'ENCODING");
      process.exit(1);
    }
  }

  function getSemana(){
    // var day = this.getDay() ;
    // if (day == 1 || day == 2)
    // 	semaine--;
    // return (day == 1 || day == 2 || day == 7) ?
    // 	semaine + "A" : semaine + "B"

    require("date-format-lite");
    var now = new Date();
    return  now.format("W");
  }

  function notDo(){
    require("date-format-lite");
    var now = new Date();
    var s = now.format("W");

    var path = process.platform == "linux" ?
      "/home/snow/out_aspiration_2/" + s + "/" + enseigne :
      "D:/out_aspiration_2/" + s + "/" + enseigne;

    try{
      return fs.readdirSync(path).map(function(a){ return a.split("-")[0] });
    }catch(err){
      return [];
    }
  }

  /* TEMPLATES */
  var template = [
    {attr:"auto_exit",                     obligatoire : false,   getter : GetBool},
    {attr:"liste_proxy",                   obligatoire : true,  getter : FileToArray},
    {attr:"list_ean",                      obligatoire : false,  getter : FileToArray},
    {attr:"divers_list",                   obligatoire : false,  getter : FileToArray},
    {attr:"encoding",                      obligatoire : false, getter : GetEncoding, defaut : 'UTF-8'},
    {attr:"nombres_requetes_paralleles",   obligatoire : true,  getter : GetUint},
    {attr:"nb_clients_par_mag",            obligatoire : true,  getter : GetUint},
    {attr:"mag_parrallele",                obligatoire : true,  getter : GetUint},
    {attr:"out_dir_semaine",		           obligatoire : false, getter : getSemana, defaut : getSemana()},
    {attr:"list_mag_todo",                 obligatoire : false, getter : FileToArray},
    // {attr:"list_mag_notdo",                obligatoire : false, getter : FileToArray},
    {attr:"list_mag_notdo",                obligatoire : false, getter : notDo, defaut : notDo()},
    {attr:"minimum_msec_entre_req",        obligatoire : false, getter : GetUint, defaut : 0},
    {attr:"minimum_msec_entre_mag",        obligatoire : false, getter : GetUint, defaut : 0},
    {attr:"reutilise_ip_bannie",           obligatoire : false, getter : GetBool, defaut : false},
    {attr:"liste_mag_attendu",             obligatoire : false, getter : FileToArray},
    {attr:"writeCSV",                      obligatoire : false, getter : GetBool, defaut : true},
    {attr:"writeJAVA",                     obligatoire : false, getter : GetBool, defaut : false},
    {attr:"auto_generation_client",        obligatoire : false, getter : GetBool, defaut: true},
    {attr:"htmlout",                       obligatoire : false, getter : GetBool, defaut: false},
    {attr:"reesaye_mag",                   obligatoire : false, getter : GetUint, defaut : 1},
    {attr:"contact",                       obligatoire : false, getter : GetBool, defaut : false},
    {attr:"produit_frais",                 obligatoire : false, getter : FileToArray},
    {attr:"limit_nomenclature",            obligatoire : false, getter : FileToArray},
    {attr:"debug",                         obligatoire : false, getter : GetBool, defaut : 0},
    {attr:"liste_url_forces",              obligatoire : false, getter : FileToArray},
    {attr:"limiter_nb_magasin_script",     obligatoire : false, getter : GetUint, defaut : 0}
  ]

  function parse_xml_config_file(filename, current_config){
    var config_flatten = fs.readFileSync(filename, "utf8"),
      config = {};
    logger.debug(config_flatten);

    var $ = cheerio.load(config_flatten);
    // var templateFileName = $("template").length > 0 ?
    // $("template").text().trim() : "default";
    // var template = JSON.parse(fs.readFileSync("./config/template/" + templateFileName + ".json", "utf8"));

    for (var i in template) {
      var obj = template[i];
      var fetched = $(obj.attr);

      if (fetched.length <= 0 && obj.obligatoire && !current_config.hasOwnProperty(obj.attr)) {
        logger.warn("Property: ".concat(obj.attr).concat(" is required in at least one config file !").yellow);
      } else if (fetched.length > 0 ) {
        config[obj.attr] = obj.getter(fetched.text());
      } else if (!current_config.hasOwnProperty(obj.attr)) {
        config[obj.attr] = obj.defaut;
      }
    }
    // logger.info(config);

    return config;
  }

  function parse_yaml_config_file(filename, current_config){
    var config = {};
    config = yaml_config.load(filename);

    for (var i in template) {
      var config_variable = template[i];
      // logger.warn(config_variable, config.hasOwnProperty(config_variable.attr));
      if (config.hasOwnProperty(config_variable.attr)){
        config[config_variable.attr] = config_variable.getter(config[config_variable.attr]);
      } else if(!current_config.hasOwnProperty(config_variable.attr)) {
        if (!config_variable.obligatoire){
          // Not required
          config[config_variable.attr] = config_variable.defaut;
        } else {
          logger.warn("Property: ".concat(config_variable.attr).concat(" is required in at least one config file !").yellow);
        }
      }
    }

    logger.debug(config);
    return config;
  }

  function parse_config_file(filename, extension, current_config){
    if (extension === "xml"){
      return parse_xml_config_file(filename, current_config);
    } else if (extension === "yml"){
      return parse_yaml_config_file(filename, current_config);
    }
  }

  this.config = {};

  /* LOADER */
  // var config = fs.readFileSync("./config/sites/" +  enseigne + ".xml", "utf8");
  var supported_formats = ["xml", "yml"];
  logger.debug("enseigne: " , enseigne);
  var files_to_load = ['global', "sites/" + enseigne];

  for (var files in files_to_load) {
    var file_loading = files_to_load[files];

    for (var i = 0; i < supported_formats.length; i++) {
      extension = supported_formats[i];

      var CONFIG_FILE = path.resolve(__dirname, "./../../aspiration/config/".concat(file_loading).concat(".").concat(extension));
      logger.info(CONFIG_FILE.cyan);

      if (fs.existsSync(CONFIG_FILE)){
        var parsed_configuration = parse_config_file(CONFIG_FILE, extension, this.config);
        if (parsed_configuration) {
          _.extend(this.config, parsed_configuration);
          // logger.info(this.config);
        }
      } else {
        logger.debug("Config file " + CONFIG_FILE + " not exists skip it");
      }
    }
  }
  logger.info(this.config["writeCSV"]);
  var has_errors = false;
  for (var i in template) {
    var config_variable = template[i];
    // logger.warn(config_variable, config.hasOwnProperty(config_variable.attr));
    if (config_variable.obligatoire && !this.config.hasOwnProperty(config_variable.attr)){
      // Required but not set property:
      logger.error("Property: ".concat(config_variable.attr).concat(" is required !").red);
      has_errors = true;
    }
  }

  if (has_errors) {
    //process.exit(1);
  }

  // TODO Steeve use a logger for this.
  // console.log(this.config);
  logger.debug(this.config);
}

module.exports = {
  create : function(name){ return new Config(name) }
}
