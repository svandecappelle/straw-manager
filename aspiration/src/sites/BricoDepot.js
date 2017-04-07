//
// BricoDepot.js for OptiMix
//

var xlblogger = require('xlblogger');
var logger = new xlblogger("BricoDepot");
logger.startLog();

var htmlToText = require('html-to-text');
var cheerio = require('cheerio');
var dateFormat = require('dateformat');
var _ = require("lodash");
var fs = require("fs");
var outils = require("../engine/outils");


var name = "BricoDepot";

function BricoDepot_GetDetailsArticles(html, obj) {
  var $ = cheerio.load(html);

//  logger.logAttrVal("Export","Level");


  var tampon = '';
  var NumLigne = 1;

  var ficheNumberOfProducts = $(".ref_val_devis.web").length;
  logger.logAttrVal('URL Fiche', obj.lasturl)
  logger.logAttrVal('ficheNumberOfProducts',ficheNumberOfProducts);


  $("table.criteria > tr").each(function() {

    var produit = engine.clone(obj.exportData);
    var tds = $(this).children("td");
    var indexId = 0

    produit.srcImage = $("#productZoom img ").attr('src')  // 23/01/2017 udpdate //// produit.srcImage = $('[itemprop="image"]').attr('src') // update 24/06/2016
    if($("table.criteria").html().indexOf("/docroot/images/tempImg/exclu-web-small.png")>0){
      indexId++
    }
    produit.idProduit = $(tds[indexId]).text().split('Réf:')[1].trim(); // Selector Update 02/07/2015

    logger.logAttrVal('mag :'+produit.magasinId+' id produit',produit.idProduit);

    var temporaryArray = produit.libelles;

    for (var k = 1; k < tds.length - 2; k++) {
      if (tds[k].children[0]) {
        if (!$(tds[k]).hasClass("redlight"))
//          produit.libelles.push($(tds[k]).text().replace(/\t/g, "").replace(/\n/g,"").replace(/\r/g, "").trim());
          temporaryArray.push($(tds[k]).text().replace(/\t/g, "").replace(/\n/g,"").replace(/\r/g, "").trim());

      }
    }
    var typeList = temporaryArray.length;

    logger.logValColor('####################[ TABLE BRUTE ]#####################');
    logger.logThis(temporaryArray)
    logger.logValColor("LIST STYLE "+typeList);

    logger.logValColor('####################[ TABLE NETTE ]#####################');

      produit.libelles = temporaryArray.slice(0, typeList-2)

    // LIST STYLE AND NUMBER OF PRODUCT PER PAGE
    // if there is many prod and the list style is 3 ==> we have to make [0] and [1] else we keep the default
    // if the list style is 2 we take [0] ==> override default (wich give an empty libelle)
      if(typeList < 3)
      produit.libelles = temporaryArray.slice(0, typeList-1);
      else if (( typeList == 3) && (ficheNumberOfProducts > 1)) {
      produit.libelles = temporaryArray.slice(0, typeList-1)
      }




      logger.logThis(produit.libelles)
      logger.logThis("table length "+produit.libelles.length)

    // ==============================================



    if (produit.libelles[1]){
      // On regarde si le libellé du produit (dans le tableau) n'est pas présent dans le libellé général du produit
      tampon = outils.ChaineSansAccent(produit.libelles[1]);
      tampon = tampon.toUpperCase();
      // S'il est présent, on va le supprimer car on va ajouter au libelle général les libellés des différentes lignes du tableau
      if (produit.libelles[0].indexOf(tampon) != -1){
        produit.libelles[0] = produit.libelles[0].replace(tampon, "");
        logger.logAttrVal('INFO', "Lib général est présent, on va le supprimer car on va ajouter les libellés des différentes lignes du tableau");
        logger.logValColor("L[0] : "+produit.libelles[0])
      }
    }
    if (produit.libelles[1]) {
      // On ajoute le libellé du tableau au libellé principal
      produit.libelles[0] += ' - ' + produit.libelles[1];
      logger.logAttrVal('INFO', "On ajoute le libellé du tableau au libellé principal");
      logger.logValColor("L[0] : "+produit.libelles[0])


      // On supprime le 2ème libellé qui est devenu inutile
      produit.libelles[1] = "";
      logger.logAttrVal('INFO', "On supprime le 2ème libellé qui est devenu inutile");
    }

    // Gestion des prix
  /*
    price.children("small").remove();
*/
    var price = $(this).find(".productTablePriceCell table").eq(0).find('td').text().trim()
    logger.logAttrVal('PRIX BRUT',price );

    // la zone prix contient les prix TTC et les prix HT
    // S'il y a 2 prix TTC, on considère que le 1er est le prix unitaire et le 2ème le prix de l'article
    // S'il n'y a qu'un seul prix, on considère qu'il n'y a que le prix de l'article
    produit.prix = price
    tampon = outils.replaceAll('\r', '', produit.prix);
    tampon = outils.replaceAll('\t', '', tampon);
    if (tampon.trim().indexOf('soit') != -1){
    // On a 2 prix
    tampon = outils.replaceAll('\r', '', tampon);
    tampon = outils.replaceAll('\n', '', tampon);
    tampon = outils.replaceAll('\t', '', tampon);

    logger.logAttrVal('DETECTED','UNITY PRICES');
    produit.prixUnite = tampon.trim().split('soit')[0]
    produit.prix = tampon.trim().split('soit')[1]
  }
  else
    //produit.prix = tampon.trim().split('\n')[0];
    produit.prix = htmlToText.fromString($(this).find(".productTablePriceCell table").eq(0).find('td'), { wordwrap: false });



    var oldprice = $(this).find(".productTablePriceCell table").eq(1).find('.oldPrice.clearfix');
    if (oldprice.length > 0){
      produit.ancienPrix = oldprice.text().trim();
      produit.promo = 1;
    }

    // On récupère les caractéristique sur la première ligne du tableau
    if (NumLigne === 1){
      //console.log($("div.prodDescr div.prodInfo").text().trim());
      produit.caracteristique = [];
      tampon = $("div.prodDescr div.prodInfo").text().trim();
      tampon = outils.replaceAll('\r', '', tampon);
      tampon = outils.replaceAll('\n', '', tampon);
      tampon = outils.replaceAll('\t', '', tampon);
      if (tampon.length > 0) produit.caracteristique.push(tampon);
    }

    NumLigne ++;
    logger.logValColor("Product Export from page :"+obj.fromPage);
    logger.logAttrVal('# FICHE ##',"###")
    console.log(produit);
    logger.logAttrVal('# FICHE ##',"###")
    engine.export_products(produit, obj);
  });
  //process.exit(0);
}


function BricoDepot_GetArticles_OneShot(html, obj) {

  logger.logTree("on page ",obj.fromPage);
  //return;


  var $ = cheerio.load(html);
  var listSize = $("#4008 li").length;
  //logger.logAttrVal(" Size ",listSize);

  if (listSize) {
    var BrandX = $("#4008 li").first().attr('id');
    logger.logAttrVal("Brand Filter",BrandX);
  }else {
    logger.logAttrVal("No Filter","Brand Missing");
  }
  if(BrandX =='Autres' || !BrandX ){
    BrandX = '';
    logger.logAttrVal("Save","Empty Brand");
  }

  var list = $(".products.clearfix li > div.product"); // From week 27

  if (!list.length) {
    console.log("There is no products in the category: " + obj.tree);
    console.log("In the store: " + obj['MagasinId'] + ": " + obj['Magasin'] + ", " + obj['Enseigne']);
    logger.logAttrVal("No List",obj.tmpUrl);
    engine.AddRequest(obj.tmpUrl, {}, {}, BricoDepot_GetArticles, obj);
  }

  newObj = engine.clone(obj);
  list.each(function() {
    var brand = $(this).find('div.brandLogo img').attr('src');
    if (!brand) brand = $(this).find("div.prodLabels img").attr('src');
    //var brand = $(this).find("div.prodLabels img").attr('src');
    var brandPattern = /\/([0-9]+)\.jpg;[0-9a-z]+$/;
    var img = $(this).find('a.prodImg > span.valignBox');
    //var idProduit = img.attr('href');
    var pattern = /\/prod+([0-9]+)\/$/;
    var label = $(this).find('div.productName > h2 > a').text().trim();

    data = {};
    //data.marque = brandPattern.exec(brand) ? mapBrands[brandPattern.exec(brand)[1]] : undefined;
//    data.marque = brand; /* Original */
    data.marque = BrandX; /* Update xlb */
    data.srcImage = img.find('img').attr("src");
    var patternImg = /^(http:\/\/www.bricodepot.fr\/[a-z0-9_\/\-]+.jpg);[a-z0-9]+$/;
    if (patternImg.exec(data.srcImage)) data.srcImage = patternImg.exec(data.srcImage)[1];
    data.lienProduit = "http://www.bricodepot.fr" + $(this).find('div.productName a').attr('href');
    data.libelles = [];
    data.libelles.push(label);
    data.categories = obj.tree;
    data.timestamp = +(new Date());
    data.enseigne = obj['Enseigne'];
    data.magasin = obj['Magasin'];
    data.magasinId = obj['MagasinId'];
    data.idxProduit = engine.getidxProduit(obj.tree);
    data.ean = undefined;
    data.dispo = data.prix ? 1 : 0;
    newObj.exportData = data;
    newObj.idxProduit = 0;

  engine.AddRequest(data.lienProduit, {}, {}, BricoDepot_GetDetailsArticles,newObj);

  });
}



//Gets all articles and pushes them in the DB
function BricoDepot_GetArticles(html, obj) {


  var $ = cheerio.load(html);
  var listSize = $("#4008 li").length;
  //logger.logAttrVal(" Size ",listSize);

  if (listSize) {
    var BrandX = $("#4008 li").first().attr('id');
    logger.logAttrVal("Brand Filter",BrandX);
  }else {
    logger.logAttrVal("No Filter","Brand Missing");
  }

  if(BrandX =='Autres' || !BrandX ){
    BrandX = '';
    logger.logAttrVal("Save","Empty Brand");
  }

  //var list = $("div.products > li > div.product");
  //var list = $("div.resultsArea div.products > li > div.product"); // Before 27
  var list = $(".products.clearfix li > div.product"); // From 27

  if (!list.length) {
    console.log("There is no products in the category: " + obj.tree);
    console.log("In the store: " + obj['MagasinId'] + ": " + obj['Magasin'] + ", " + obj['Enseigne']);

    logger.logAttrVal("No List",obj.tmpUrl);

  engine.AddRequest(obj.tmpUrl, {}, {}, BricoDepot_GetArticles, obj);
  }

  newObj = engine.clone(obj);
  list.each(function() {
    var brand = $(this).find('div.brandLogo img').attr('src');
    if (!brand) brand = $(this).find("div.prodLabels img").attr('src');
    //var brand = $(this).find("div.prodLabels img").attr('src');
    var brandPattern = /\/([0-9]+)\.jpg;[0-9a-z]+$/;
    var img = $(this).find('a.prodImg > span.valignBox');
    //var idProduit = img.attr('href');
    var pattern = /\/prod+([0-9]+)\/$/;
    var label = $(this).find('div.productName > h2 > a').text().trim();

    data = {};
    //data.marque = brandPattern.exec(brand) ? mapBrands[brandPattern.exec(brand)[1]] : undefined;
//    data.marque = brand; /* Original */
    data.marque = BrandX; /* Update xlb */

    // idProduit = idProduit ? pattern.exec(idProduit)[1] : undefined;
    // console.log("IDPRODUIT :: " + idProduit);
    //data.prix = $(this).find('div.price > a > div.curentPrice').text().trim();
    // data.ancienPrix = $(this).find('div.price > a > div.oldPrice').length ?
    //     $(this).find('div.price > a > div.oldPrice').text().trim() : undefined;
    data.srcImage = img.find('img').attr("src");
    var patternImg = /^(http:\/\/www.bricodepot.fr\/[a-z0-9_\/\-]+.jpg);[a-z0-9]+$/;
    if (patternImg.exec(data.srcImage)) data.srcImage = patternImg.exec(data.srcImage)[1];

    data.lienProduit = "http://www.bricodepot.fr" + $(this).find('div.productName a').attr('href');
    data.libelles = [];
    data.libelles.push(label);
    //data.libelles.push($(this).find('div.addInfo').text().trim());
    //data.idProduit = idProduit;
    data.categories = obj.tree;
    data.timestamp = +(new Date());
    data.enseigne = obj['Enseigne'];
    data.magasin = obj['Magasin'];
    data.magasinId = obj['MagasinId'];
    data.idxProduit = engine.getidxProduit(obj.tree);
    //data.promo = data.ancienPrix ? 1 : 0;
    //data.promoDirecte = data.promo;
    data.ean = undefined;
    data.dispo = data.prix ? 1 : 0;
    newObj.exportData = data;
    //newObj = engine.clone(obj);
    //newObj.tree.push(category);
    //newObj.tree.push(subCategory);
    newObj.idxProduit = 0;
    newObj.fromPage = 1;

    //console.warn(data.categories + "");
    engine.AddRequest(data.lienProduit, {}, {}, BricoDepot_GetDetailsArticles,newObj);
  });


    // Manage pagination #--# update 29-o6-2o15 #--#
    // we are gonna take the total number of product and the number of product per page From the URL then we could know the number of page
    var pagination = $("div.pagination").first().find("ul li");
    var paginationLength = $("div.pagination").first().find("ul li").length;


    if (pagination && paginationLength > 0) {
                        /* flag one */   logger.logTree(' we have ',paginationLength-1,' pages'); // we subtract the previews link (<<)
                        /* flag two */   if( paginationLength > 3 )logger.logAttrVal('big nomenc',obj.tmpUrl);



            //### ULR management ZOne
            var urlNet = obj.tmpUrl;
//            var urlNet = $("div.pagination").first().find("ul li a").last().attr("href").split("?")[0];
            var numberOfProducts=$("div.pagination").first().find("ul li a").last().attr("href").split("totalCountPages=");
            numberOfProducts = numberOfProducts[1].split('&')[0]; // now its the last parameter but in case they add some variable in the end
            var numberOfProdPerPage=$("div.pagination").first().find("ul li a").last().attr("href").split("pageSize=");
            numberOfProdPerPage = numberOfProdPerPage[1].split('&')[0];
            var numberOfPage =  numberOfProducts/ numberOfProdPerPage;
            numberOfPage = Math.ceil(numberOfPage);

            // if we are not filtring brand, we must put "?" in the Link, cuz its the only variable
            var firstVar = "";
            if (BrandX == '')firstVar = "?pageSize="+numberOfProdPerPage;
            //

            logger.logAttrVal( numberOfProducts+" product ","in "+numberOfPage+" Pages");
            // ### End URL Management Zone

            for (var i = 2; i <= numberOfPage; i++) {
              var UrlBrut = urlNet+firstVar+"&pageNum="+i;
              logger.logTree(urlNet,i,UrlBrut);
              obj2 = engine.clone(obj);
              obj2.fromPage = i;
              engine.AddRequest(UrlBrut, {}, {}, BricoDepot_GetArticles_OneShot, obj2);
            }
    }else {
      logger.logAttrVal('no pagination',':D');
    }
}

// After having a problem getting brands name, we added this function to filter with brand a group of products;)
function BrandLoader(html, obj) {

  var $ = cheerio.load(html);
  var listSize = $("#4008").first().find("li a").length;
  logger.logAttrVal(" Size ",listSize);
  //logger.logAttrVal(" Html ",html);


  if (listSize) {
    $("#4008").first().find("li").each(function() {
      var Brand = $(this).attr('id');
      var BrandLink = $(this).find("a").attr('href');
      logger.logAttrVal(Brand,BrandLink);
  ///* debug */return;
      cloneX = engine.clone(obj);
      cloneX.tmpUrl = BrandLink;
      engine.AddRequest(BrandLink, {}, {},BricoDepot_GetArticles, cloneX);
    });
  }else {
      //  /* debug */return;
      clone = engine.clone(obj);
      logger.logAttrVal(" [brand loader] "," No brands :$ ");
      engine.AddRequest(clone.tmpUrl, {}, {},BricoDepot_GetArticles, clone);
  }
}



//Gets Subcategory with AJAX GET && rel ID
function nomenclature(html, obj) {
  var $ = cheerio.load(html);

  obj = engine.clone(obj);
  obj.attach_client = true;

  var script = $("#mn > script").text().replace("\"Bali\"", "'Bali'").trim();

  try {
    eval(script);
  } catch (err) {

    logger.logAttrVal("cant eval",err.stack);
    console.log('dans erreur');
    console.error(err, err.stack);
  }
  //console.log(categories)
  //process.exit(0);
  //logger.logAttrVal("src js",script);
 //return;

  $("#mn > ul > li").each(function(idx) {
    var n1 = $(this).find('a > .linkText').text().trim();

   if (n1 !=='Nouveautés' && n1 !=='Toujours moins cher !') {

      logger.logValColor(n1);
      if (!categories[idx+1]) {// Decalage de nomenclature 24/10/2016
        console.log("Quit"); // case of mag sisteron; cannot get Matériaux-Matériel
        return
      }

      _(categories[idx+1].subCategories).forEach(function(elm) { // Decalage de nomenclature 24/10/2016
        var n2 = elm.name; //$(this).find("dt span").text();
        logger.logAttrVal(n1,n2);
        _(elm.subCategories).forEach(function(elm2) {
          var n3 = elm2.name;
          clone = engine.clone(obj);
          clone.tree = [n1, n2, n3];
          clone.tmpUrl = elm2.url;
          logger.logTree('Nomenclature', clone.tree,  clone.tmpUrl);

          // (y) we visit every nomenc

       engine.AddRequest(elm2.url, {}, {},BrandLoader, clone);   //# xlb update #
        });
      });
   }
  });

//obj.tmpUrl ="http://www.bricodepot.fr/reims/outillage/electroportatif/meuleuses/" // Promo
//obj.tmpUrl ="http://www.bricodepot.fr/mulhouse/bois-interieur/stratifies-parquets-planchers/sous-couche-et-accessoires-de-pose/" // Example Mail
//obj.tmpUrl ="http://www.bricodepot.fr/reims/menuiserie/fenetres/fenetres-bois-haute-isolation/"
//engine.AddRequest(obj.tmpUrl, {}, {},BrandLoader, obj); /* xlb update */

//obj.tmpUrl ="http://www.bricodepot.fr/montlucon/plomberie/robinetterie-de-renovation/mitigeurs-et-melangeurs/"
//engine.AddRequest("http://www.bricodepot.fr/montlucon/plomberie/robinetterie-de-renovation/mitigeurs-et-melangeurs/", {}, {},BrandLoader, obj); /* xlb update */
// Test pagination
/* 6 page  */ //engine.AddRequest("http://www.bricodepot.fr/moulins/electricite/appareillage/appareillage-a-composer/", {}, {},BricoDepot_GetArticles, obj);
/*2 pages */ //engine.AddRequest("http://www.bricodepot.fr/verniolle-pamiers/quincaillerie/pietement-roulement/roulettes/", {}, {},BricoDepot_GetArticles, obj);
//engine.AddRequest("http://www.bricodepot.fr/moulins/outillage/soudure/soudure-flamme/", {}, {},BricoDepot_GetArticles, obj);
/* 2 Brands 1p */ //engine.AddRequest("http://www.bricodepot.fr/montlucon/electricite/appareillage/appareillage-etanche/", {}, {},BricoDepot_GetArticles, obj);
//engine.AddRequest("http://www.bricodepot.fr/reims/menuiserie/poignees-de-portes-et-fenetres/poignees-de-portes-interieures/", {}, {},BrandLoader, obj);
/* filter brand */ // urlFiltred = "http://www.bricodepot.fr/reims/menuiserie/poignees-de-portes-et-fenetres/poignees-de-portes-interieures/?facetTrail=1002%3a14011%3a4008%3aASSA+ABLOY&pageSize=12&selectedValue=4008%3aASSA+ABLOY&searchId=1466757052850&categoryId=14011"
//engine.AddRequest(urlFiltred, {}, {},BricoDepot_GetArticles, obj);

}


function patch(html, obj){
  var $ = cheerio.load(html);
  ReqObject = engine.clone(obj);

  var magLib = $(".storeName .textRed").text()
  logger.logValColor(magLib);
  engine.AddRequest(ReqObject.tmpurl, {}, {}, nomenclature, ReqObject);

//Dev
//  engine.AddRequest("http://www.bricodepot.fr/angouleme-champniers/menuiserie/poignees-de-portes-et-fenetres/poignees-de-portes-interieures/", {}, {},BrandLoader, ReqObject);
}


//Retrieves stores list
function BricoDepot_MagasinList(html, obj) {
  //process.exit(0);

// test fiche prod
//  obj.tmpUrl ="http://www.bricodepot.fr/mulhouse/sous-couche-confort-polystyrene/prod31992/"
//  engine.AddRequest(obj.tmpUrl, {}, {},BricoDepot_GetDetailsArticles, obj); /* xlb update */

  var $ = cheerio.load(html);
  list = $("#myStoreM").children() // update 14-12-2o15

  //$("div.storeArea > form > select#headerStoreSel > option").each(function(idx) {
  list.each(function(idx) {

    //process.exit(0);

    var MagasinName = $(this).text().replace(/\n/g,' ').replace(/\t/g,'').trim();
    var url = $(this).attr('data-url');
    var MagasinId = $(this).attr('value');
    logger.logValColor(MagasinId+" : "+url+" => "+MagasinName);

    if (MagasinId.length < 1) {
      console.log("NOT A MAG");
      return;
    }
  //  console.log("MagasinId " + MagasinId);

    if (engine.shouldBeDone(MagasinId)) {
      ReqObject = engine.clone(obj);
      ReqObject.tree = [];
      ReqObject.Magasin = MagasinName;
      ReqObject.MagasinId = MagasinId;
      ReqObject.tmpurl = url;
      ReqObject.retryHome = 0;
      //engine.AddRequest(url, {}, {}, nomenclature, ReqObject);
      engine.AddRequest(url, {}, {}, patch, ReqObject);
    }
  });

}

function update(param) {
  var obj = {};

  engine.init(param.ttw, param.tor);
  engine.setProxyList(param.proxy_list);
  engine.setParallelRequest(param.parr_req);
  obj.hostname = "www.bricodepot.fr";
  obj.filename = param.filename;
  obj.Enseigne = name;

  engine.BindRequest("/", {}, {}, BricoDepot_MagasinList, obj)
  //DEV AND DEBUG
  //obj.exportData ={}
  //obj.tree = [];
  //engine.BindRequest("http://www.bricodepot.fr/saint-quentin-harly/compacteur-thermique-90-cv/prod46877/", {}, {}, BricoDepot_GetDetailsArticles, obj)// exclu Web
  //engine.BindRequest("http://www.bricodepot.fr/montlucon/gaine-tpc-annelee-25-m/prod11690/", {}, {}, BricoDepot_GetDetailsArticles, obj)
  //engine.BindRequest("http://www.bricodepot.fr/sisteron/", {}, {}, nomenclature, obj) // test
  //engine.BindRequest('http://www.bricodepot.fr/reims/patins-feutres-adhesifs/prod1948/', {}, {}, BricoDepot_GetDetailsArticles, obj)
  //engine.BindRequest('http://www.bricodepot.fr/reims/quincaillerie/pietement-roulement/patins-et-embouts/', {}, {}, BricoDepot_GetArticles, obj)

}

module.exports = {
  update: update
};
