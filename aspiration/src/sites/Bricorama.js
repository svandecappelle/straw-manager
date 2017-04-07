var cheerio = require('cheerio');
var dateFormat = require('dateformat');
var outils = require("../engine/outils");
var xlblogger = require('xlblogger');
var logger = new xlblogger("Bricorama");
var name = "Bricorama";
var request = require('request');
var htmlToText = require('html-to-text');

/*
process.on('uncaughtException', function(err) {

  logger.logAttrVal("uncaughtException",err);
  console.log(err);
});*/


function Bricorama_FicheProduit(html, obj){
  var $ = cheerio.load(html);
  data = obj.data;
  ReqObject = engine.clone(obj);

  logger.logAttrVal("Level Fiche",data.idProduit);

//  var caracteristiqueRef = $(".product-name div").text().trim().split('Réf: ')[1].trim();
  var caracteristiqueRef = $(".product-name div").text().trim()
  tampon = outils.replaceAll('\n', ' ', caracteristiqueRef);


  data.marque = $(".product-brand-logo img").attr('title')

  data.caracteristique = [];
  data.caracteristique.push(tampon);
  //data.caracteristique.push(caracteristique0);

   var caracBloc = htmlToText.fromString($(".product-toggle-content div").html(), { wordwrap: false });
   tampon = outils.replaceAll('\n', ' ', caracBloc);

   data.caracteristique.push(tampon);



  logger.logAttrVal("Fiche", "Start");
  console.log(data);
  logger.logAttrVal("Fiche", "End");
  engine.export_products(data, ReqObject);
}


function Bricorama_ListeProduits(html, obj){

    newObj = engine.clone(obj);
    var $ = cheerio.load(html)
    logger.logAttrVal("Manage", $(".page-title.body-wrapper-margin .small").text());
    //logger.logValColor($(".header-item.magasin .smaller"));
  //  logger.logValColor(html);

    logger.logValColor("Nb Elem : "+$(".results.grid .item").length);

      $(".results.grid .item").each(function(elm){

        ReqObject = engine.clone(obj);
        data = {};


        data.lienProduit = $(this).find(".page-link").attr('href')
        ReqObject.force_url_prod = data.lienProduit;
        data.categories= ReqObject.tree;
        data.timestamp = +(new Date());
        data.enseigne = ReqObject['Enseigne'];
        data.magasin = ReqObject['Magasin'];
        data.magasinId = ReqObject['MagasinId'];

        data.libelles = [];
        data.libelles.push($(this).find(".img-wrapper img").attr('alt'))
        data.prix = $(this).find(".price").text().trim()
        data.srcImage = $(this).find(".img-wrapper img").attr('src')
        data.idProduit = $(this).find("[id*='product-price-']").attr("id").split('-')[2]
        //var regcip7 = new RegExp (/([0-9])/ {4,})
        var re = /([0-9]){4,}/;
        var m;

        try {
          var strCip7  = data.srcImage.substring(data.srcImage.lastIndexOf('/')+1).split('-')[0]
          if ((m = re.exec(strCip7)) !== null) {
            data.cip7 = m[0]
            logger.logTree('idProduit 2 ==>', data.srcImage, data.cip7)
          }else {
            logger.logValColor('Pas de CIP7 ! (idProduit 2)')
          }
        } catch (e) {
          logger.logAttrVal('Probleme CIP7', e)
        }

        if ($(this).find("[id*='old-price-']")) {
          data.ancienPrix = $(this).find("[id*='old-price-']").text().trim()
          data.prix = $(this).find("[id*='product-price']").text().trim()
        }
        data.promo =  data.ancienPrix ? 1 : 0;
        data.promoDiff = undefined;
        data.ean = undefined;
        data.dispo = ($(this).find(".table-wrapper .lines-wrapper").eq(1).text().trim() == "AJOUT AU PANIER" )? 1 : 0;

        //console.log(data);
        //process.exit(0);
        ReqObject.data = data;

        if (data.magasinId == 84) {
          engine.BindRequest(data.lienProduit, {}, {}, Bricorama_FicheProduit, ReqObject);
        }else {
         engine.export_products(data, ReqObject);
        }

      /*  logger.logAttrVal("List", "Start");
        console.log(data);
        logger.logAttrVal("List", "End"); */

      });


      var next = $(".next.i-next").attr('href')
      if (next) {
        logger.logAttrVal("NEXT PAGE", next);
        engine.BindRequest(next, {}, {}, Bricorama_ListeProduits, newObj);
      }else {
        logger.logAttrVal("NO","PAGINATION");
      }

}


function Bricorama_inMagasin(html, obj){
  var $ = cheerio.load(html);

  logger.logAttrVal("Magasin",$('[itemprop="name"]').first().text());
  $("#menu ul li.level0").each(function(elm){
    if ($(this).find('a').text().trim() == "Conseils" || $(this).find('a').text().trim() == "Bonnes Affaires") {
      console.log("Not Interesting");
      return;
    }

    var level0 = $(this).find('a.level0').first().text().trim()
    logger.logAttrVal("Level0 : ",level0);

    $(this).find(".sub-menu li.level1").each(function(elm){

      var level1 = $(this).find('a.level1').first().text().trim()
      logger.logTree(level0,level1,' :D ');

      $(this).find(".sub-menu li.level2").each(function(elm){
        var level2 = $(this).find('a.level2').first().text().trim()

        ReqObject = engine.clone(obj);
        var cookie = 'smile_retailershop_id='+obj.MagasinId
        ReqObject.xlbSetJar = cookie

        ReqObject.tree = [];
        ReqObject.tree.push(level0);
        ReqObject.tree.push(level1);
        ReqObject.tree.push(level2);
        var url2 = $(this).find('a.level2').first().attr('href')
        logger.logTree(url2,level1,level2);


        // if there is level 3 we continue looping nomenc, else we navigate prod list from level 2
        thereIsLevel3 = $(this).find(".sub-menu li.level3").length > 0

        if (thereIsLevel3) {
        logger.logValColor("Request from Level three")
          $(this).find(".sub-menu li.level3").each(function(elm){
            var level3 = $(this).find('a.level3').first().text().trim()
            var url3 = $(this).find('a.level3').first().attr('href')
            console.log(level3+' => '+url3);
            Object3 = engine.clone(ReqObject);
            Object3.tree.push(level3);
            engine.BindRequest(url3, {}, {}, Bricorama_ListeProduits, Object3);

          });
        }else {
            logger.logValColor("Request from Level two")
            engine.BindRequest(url2, {}, {}, Bricorama_ListeProduits, ReqObject);

        }
      });
    });
  });
}



function Bricorama_Magasin(html, obj) {
  var $ = cheerio.load(html);
  var getMag = html.split('"lat":')
  for (var i = 1; i < getMag.length; i++) {
    dont = false
    var Magasin = getMag[i].split('label":"')[1].split('"')[0].trim()
    var link = getMag[i].split('<a href=\\"')[1].split('"')[0].trim()
    linkMag = link.replace(/\\/g,'')
    var MagasinId = getMag[i].split('"id":"')[1].split('"')[0].trim()
    try {
      if(getMag[i].split('span class=\\"error\\">')[1].split('<')[0] =='Ce magasin ne permet pas l\\u2019achat en ligne'){
        dont = true
        logger.logAttrVal('Pas de vente en ligne', MagasinId)
      }
    } catch (e) {
      logger.logAttrVal('En ligne', MagasinId)
    }
    if (engine.shouldBeDone(MagasinId) && !dont) {
      logger.logTree(Magasin, linkMag, MagasinId)
      var cookie = 'smile_retailershop_id='+MagasinId
      newObj = engine.clone(obj);
      newObj.xlbSetJar = cookie
      newObj.MagasinId = MagasinId;
      newObj.Magasin = Magasin;
      engine.BindRequest(linkMag, {}, {}, Bricorama_inMagasin, newObj);
    };
  }
}


function Bricorama_SetCookies(html, obj){
  var $ = cheerio.load(html);
  var forCookie = html.split('"id":"')[1].split('"')[0].trim()
  newObj = engine.clone(obj);
  var cookie = 'smile_retailershop_id='+ forCookie
  newObj.xlbSetJar = cookie
  engine.BindRequest("/", {}, {}, Bricorama_Magasin, newObj);
  // DEBUG ZONE
    //engine.BindRequest(link, {}, {}, Bricorama_inMagasin, newObj);
    // engine.BindRequest(link, options, {}, Bricorama_SetCookies, newObj);

}

function update(param){
    var obj = {};
    obj.hostname = "www.bricorama.fr";
    obj.Enseigne = name;
    engine.AddRequest("/", {}, {}, Bricorama_SetCookies, obj);
}

module.exports = {
    update : update
};
