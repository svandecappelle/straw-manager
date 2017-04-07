var cheerio = require('cheerio');
var dateFormat = require('dateformat');
var _ = require("lodash");
var fs = require("fs");
var htmlToText = require('html-to-text');
var outils = require("../engine/outils");
var xlblogger = require('xlblogger');
var logger = new xlblogger("Weldom");
var name = "Weldom";

function ficheProduit(html, obj){
  var $ = cheerio.load(html);
  var data = obj.data;
  //data = {}
  //data.libelles =[]
  try {
    var caracteristiques = html.split('class="std">')[1].split('<div class=')[0].trim()
    data.caracteristique = outils.prettify_me(caracteristiques).split(";");
  } catch (e) {
    logger.logAttrVal('Problème Carac', e)
  }
  try {
    data.srcImage = $('#image-main').attr('src')
  } catch (e) {
    logger.logAttrVal('Pas de nouvelle image', e)
  }

  //$('.details-pdf').parent().text()//$('.std').not('.bottom-links').text().trim();
  //logger.logAttrVal('caracteristiques ', caracteristiques)
  if(html.indexOf('prix_plancher') > 0 )
    data.libelles.push('Prix Plancher')
    data.promo= 1
  if (html.indexOf('prix_weldom') > 0) {
    data.libelles.push('Prix Weldom')
    data.promo = 1
  }
  if($('.is-unite').length > 0)
    data.prixUnite = $('.is-unite').text().trim()
  data.cip13 = $('.data').eq(1).text().trim()
  try {
    var ean = html.split('>code barre</th>')[1].split('</td>')[0]
    data.ean =ean.split('"data">')[1]
  } catch (e) {
      logger.logAttrVal('Problème EAN', e)
  }

  logger.logAttrVal('Data Carac', 'BEGIN')
  console.log(data);
  engine.export_products(data, obj);
  logger.logAttrVal('Data Carac', 'END')


}

function prodList(html, obj){
  var $ = cheerio.load(html);

  $('.category-products.catalog-category-style [itemprop="itemListElement"]').each(function(){
    ReqObject = engine.clone(obj)
  	var data = {};
    data.enseigne = ReqObject['Enseigne'];
    data.magasin = ReqObject['Magasin'];
    data.magasinId = ReqObject['MagasinId'];
    data.categories= ReqObject.tree;
    data.lienProduit = $(this).find('.product-image').attr('href')
    ReqObject.force_url_prod = data.lienProduit;
	  data.srcImage = $(this).find('[itemprop="image"]').attr("src");
    data.libelles = []
    data.libelles.push($(this).find('.product-name > a').attr('title'))
    try {
      data.idProduit = $(this).find('[itemprop="price"]').attr("id").split("-").pop();
    } catch (e) {
      logger.logAttrVal('Problème IdProduit', e)
    }
    if (!data.idProduit ) {
      try {
        data.idProduit = $(this).find('.regular-price').attr("id").split("-").pop();
      } catch (e) {
        logger.logAttrVal('Problème IdProduit 2eme essai', e)
      }
    }
    if ($(this).find(".regular-price").length > 0){
      data.prix = $(this).find(".price").text().trim();
    }else{
      /*           Promo          */                     // 20/02/2017
      data.ancienPrix = $(this).find(".old-price .price").text().trim();
      console.log(  $(this).find(".special-price").html());
      data.prix = $(this).find(".special-price .price ").text().trim();
      if ($(this).find(".special-price > .price").length > 0 && $(this).find(".special-price > .price").attr("id") != undefined)
      data.promo = 1;
      data.promoDirecte = $(this).find('.IM_percent').text().trim()
    }
    try {
      data.marque = $(this).find('[itemprop="image"]').attr('alt').split('.jpg')[0]
    } catch (e) {
      logger.logAttrVal('Pas de Marque dans la liste pour le produit n '+ data.idProduit,e)
    }
    var cip7 = data.srcImage.substring(data.srcImage.lastIndexOf('/')+1).split('.jpg')[0]
    if(isNaN(cip7) == true){
      logger.logAttrVal('Pas un idproduit2 !')
    }else {
      data.cip7 = cip7
    }

    data.dispo = ($(this).find('.availability.out-of-stock').length > 0) ? 0 : 1;
    if (data.magasinId == "0"){
      clone = engine.clone(ReqObject);
      // On va rechercher les caractéristiques pour ce magasin. On considère que c'est le magasin de référence
      clone.data = data;
      engine.BindRequest(data.lienProduit, {}, {}, ficheProduit , clone);
    } else{
      logger.logAttrVal('DATA', 'BEGIN')
      console.log(data);
      engine.export_products(data, ReqObject);
      logger.logAttrVal('Data', 'END')
    }

  });
  // Pagination
  logger.logAttrVal('Page suivante ?', $('.next.i-next').length)
  if($('.next.i-next') && $('.next.i-next').length > 0){
    Page = engine.clone(obj)
    var nextPage = $('.next.i-next').attr('href')
    logger.logAttrVal('Paginate to : ', nextPage)
    engine.BindRequest(nextPage, {}, {}, prodList , Page);
  }
}


function nomenclature(html, obj){
  var $ = cheerio.load(html);
  logger.logValColor('Mag == > ' + $('.header-logo .logo').attr('href').split('.fr/')[1])

  $(".col-category.col-xs-12 .form-group.col-dynamic ").each(function () {
    ReqObject = engine.clone(obj)
    var level0 = $(this).find(".parent_cateogry").first().text().trim()
    logger.logAttrVal('Levl ZERO', level0)
    $(this).find(' .parent.form-group.text-left ').each(function () {

      ReqObject2 = engine.clone(ReqObject)
      var level1 = $(this).find('a').text().split('›')[1].trim()
      var catId = $(this).attr('category_id')
      var urllevel1 = $(this).find('a').attr('href')

      var selectorLvl3 = '#child-'+catId
      logger.logTree('Level One', level1, selectorLvl3)
      if($(selectorLvl3+' .form-group.text-left').length > 0){
        $(selectorLvl3+' .form-group.text-left').each(function () { //.form-group.text-left
          ReqObject3 = engine.clone(ReqObject2)
          ReqObject3.tree = []
          var level2 = $(this).find('a').attr('title')
          ReqObject3.tree.push(level0)
          ReqObject3.tree.push(level1)
          ReqObject3.tree.push(level2)
          var url = $(this).find('a').attr('href')
          logger.logTree('Nomenclature', ReqObject3.tree, url)
          engine.BindRequest( url, {}, {}, prodList, ReqObject3);
        })
      }else {
        clone = engine.clone(ReqObject2)
        clone.tree = []
        clone.tree.push(level0)
        clone.tree.push(level1)
        logger.logAttrVal('Pas de level 2 ', urllevel1)
        engine.BindRequest( urllevel1, {}, {}, prodList, clone);
      }
    })

  })
}

function Weldom_SansMagasin(obj) {
  ReqObject = engine.clone(obj);
  ReqObject.Magasin = 'Web';
  ReqObject.MagasinId = 0;
  if (engine.shouldBeDone(0)){
    engine.BindRequest("/", {}, {}, nomenclature, ReqObject);
    //engine.BindRequest('http://www.weldom.fr/weldom/bati/toiture-secondaire.html', {}, {}, prodList, ReqObject) // TEst List ZERO
    //engine.BindRequest('http://www.weldom.fr/weldom/clou-calotin-tors-2-7x60-25pce.html', {}, {}, ficheProduit, ReqObject) // TEst List ZERO
    //engine.BindRequest('http://www.weldom.fr/weldom/brouette-jardin-polypropylene-professionnel-100l-120kg.html', {}, {}, ficheProduit, ReqObject)
    //engine.BindRequest('www.weldom.fr/weldom/ciment-blanc-10kg-axton.html', {}, {}, ficheProduit, ReqObject)
  }
}


function Patch(html, obj){
  var $ = cheerio.load(html);
  clone = engine.clone(obj)
  engine.BindRequest(clone.urlMag, {}, {}, nomenclature, clone);

  // Dev and Debug
  //engine.BindRequest('http://www.weldom.fr/lavelanet/chauffage-air/cheminee-poele-fixe.html', {}, {}, prodList, clone); // List Prod
  //engine.BindRequest('http://www.weldom.fr/linselles/outillage/outillage-electroportatif/perforateur-filaire.html', {}, {}, prodList, clone); // pagination

}


function magList(html, obj){
  var $ = cheerio.load(html);

  Weldom_SansMagasin(obj);
  var magNotTdo = engine.GetListUrls() // Liste des mags ne fonctionnant pas encore ou ayant un url different


  $('#list-store-detail .el-content').each(function (i) {
    ReqObject = engine.clone(obj)
    var idStore = $(this).find('.two > span').attr('storelocator_id')
    var magUrl = $(this).find('.tag-buttons > a').attr('href')
    try {
      ReqObject.urlMag = magUrl.split('weldom/')[1]
    } catch (e) {
      logger.logAttrVal('Probleme magUrl '+ i, idStore )
    }

    if (  ReqObject.urlMag.indexOf('weldom-')> -1) {
      ReqObject.urlMag = ReqObject.urlMag.split('weldom-')[1]// Certains urls possèdent "weldom" dans leur url. A eviter
    }

      if (idStore && engine.shouldBeDone(idStore) ){ //&& (magNotTdo.indexOf(idStore) < 0)){
        //Certains mags ayant un url different de sur la page
        for (var i = 1; i < magNotTdo.length; i++) {
          logger.logAttrVal('mag with wrong url', magNotTdo[i])
          clone = engine.clone(obj)
          clone.urlMod = magNotTdo[i].split(';')[1]
          currentidStore = magNotTdo[i].split(';')[0]
          logger.logTree('TO DO', currentidStore, clone.urlMod)
          if (currentidStore == idStore &&  clone.urlMod){
            logger.logAttrVal("loaded ", clone.urlMod)
            ReqObject.urlMag = clone.urlMod
          }
        }
        ReqObject.Magasin = $(this).find('.name').text().trim()
        ReqObject.MagasinId = idStore
        logger.logTree('Mag '+ ReqObject.Magasin , ReqObject.MagasinId ,  ReqObject.urlMag)
        //engine.BindRequest(ReqObject.urlMag+"customdev/index/getWebsiteUrl/?storelocator_id="+idStore, {}, {}, Patch, ReqObject);
        engine.BindRequest("/weldom/customdev/index/getWebsiteUrl/?storelocator_id="+idStore, {}, {}, Patch, ReqObject);
      }else {
        logger.logAttrVal(idStore,"ALREADY DONE")
      }

  })

}



function update(param){
    var obj = {};
    obj.hostname = "www.weldom.fr";
    obj.Enseigne = name;
    engine.BindRequest("/weldom/carte-magasins/?url=%2Fcatalogsearch%2Fresult%2F", {}, {}, magList, obj);
    //engine.BindRequest('/',{},{}, nomenclature, obj)

}

module.exports = {
    update : update
};
