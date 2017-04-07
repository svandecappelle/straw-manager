/*!
 * Optimix Aspiration
 * Author: Gautier Fauchart <gautier.fauchart@gmail.com>
 * MIT Licensed
 */

var _ = require("lodash");
var Q = require("q")
var builder = require('xmlbuilder');
var fs = require("fs");
var cheerio = require("cheerio")
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
    if (string == "true" || string == "1")
      return true;
    else if (string == "false" || string == "0")
      return false;
    else{
      console.red("la config, contient un mauvais bolleen");
      process.exit(1);
    }
  }

  function GetEncoding(string){
    if (string == "ISO-8859-1" || string == "UTF-8" || string == "ISO-8859-15") {
      return string;
    } else {
      console.red("ERREUR D'ENCODING");
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
    {attr:"liste_proxy",                   obligatoire : true,  getter : FileToArray},
    {attr:"list_ean",                   obligatoire : false,  getter : FileToArray},
    {attr:"divers_list",                   obligatoire : false,  getter : FileToArray},
    {attr:"encoding",                      obligatoire : false, getter : GetEncoding, defaut : 'UTF-8'},
    {attr:"nombres_requetes_paralleles",   obligatoire : true,  getter : GetUint},
    {attr:"nb_clients_par_mag",            obligatoire : true,  getter : GetUint},
    {attr:"mag_parrallele",                obligatoire : true,  getter : GetUint},
    {attr:"out_dir_semaine",		   obligatoire : false, getter : getSemana, defaut : getSemana()},
    {attr:"list_mag_todo",                 obligatoire : false, getter : FileToArray},
  //  {attr:"list_mag_notdo",                obligatoire : false, getter : FileToArray},
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
    {attr:"limiter_nb_magasin_script",     obligatoire : false, getter : GetUint, defaut : 0}]




    /* LOADER */

//    var config = fs.readFileSync("./config/sites/" +  enseigne + ".xml", "utf8");
    var CONFIG_FILE = path.resolve(__dirname, "./../../config/sites/" +  enseigne + ".xml")
    var config = fs.readFileSync(CONFIG_FILE, "utf8");

    var $ = cheerio.load(config);
    //var templateFileName = $("template").length > 0 ?
    //$("template").text().trim() : "default";
    //var template = JSON.parse(fs.readFileSync("./config/template/" + templateFileName + ".json", "utf8"));
    this.config = {};
  for (var i in template){
    var obj = template[i];
    var fetched = $(obj.attr);
    if (fetched.length <= 0 && obj.obligatoire){
      console.warn("le champs: " + obj.attr + " est obligatoire!");
      process.exit(1);
    }
    else if (fetched.length > 0)
      this.config[obj.attr] = obj.getter(fetched.text());
    else
      this.config[obj.attr] = obj.defaut;
  }

    console.log(this.config);
}


module.exports = {
  create : function(name){ return new Config(name) }
}
