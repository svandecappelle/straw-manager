var cheerio = require('cheerio');
var dateFormat = require('dateformat');
var fs = require("fs");
var outils = require("../engine/outils");
var htmlToText = require('html-to-text');

var name = "LeroyMerlin";
var urlparse = require("url");

var xlblogger = require('xlblogger');
var logger = new xlblogger("LMallComplete");


function LM_FICHE(html, obj) {
	var $ = cheerio.load(html);

	if ($('[property="og:type"]').attr('content') !== 'product') {
		logger.logAttrVal(obj.id,' does not land on a product page ')
		return;
	}

	var data = {};
	data.timestamp = +(new Date());
	data.enseigne = obj['Enseigne'];
	data.magasin = obj['Magasin'];
	data.magasinId = obj['MagasinId'];
	data.srcImage = $('#img-01').attr('src')
	data.libelles = []
	if (!$("[itemprop='name']").text().trim()){
		Reload = engine.clone(obj)
		logger.logAttrVal('Problème chargement de page: ', !$("[itemprop='name']").text().trim())
		engine.AddRequest(Reload.lasturl, {}, {}, LM_FICHE, Reload);
	}
	data.libelles.push($("[itemprop='name']").text().trim());
	data.libelles.push($(".showcase-product span.picto-marque").text().trim()) // 14/06/2016 info sur le prix expl: 1er prix / Prix Haute Qualité
  var infos_stores = htmlToText.fromString($('.infos-stores').html(), { wordwrap: false}).replace(/\n/g," ");
	if (infos_stores.indexOf("Changer de magasin") > 0) infos_stores = infos_stores.split('Changer de magasin')[0].trim()
  data.libelles.push(infos_stores)

	data.idProduit = obj.id
	data.promo = 0;
	data.prix = $('.showcase-product .price').text()
	data.prixUnite = $(".showcase-product em.infos.capacity").text().trim();
	data.promoDiff = undefined;
	if ($(".price-wrapper p.infos em.barred").length > 0){
		data.ancienPrix = $(".price-wrapper p.infos em.barred em").text().trim();
		data.promo = 1;
		if (data.prixUnite.length < 1) {
			data.prixUnite = $(".infos.capacity").text().trim();
		}
	}
	data.ean = undefined;
	data.dispo = ($('.showcase-product .ico-checkout-basket').length > 0)? 1 : 0;

	try {
		var breadcrumb = html.split("product_breadcrumb_label : ['")[1].split("']")[0]  //  var breadcrumb = html.split("product_breadcrumb_label : ['")[1].split("'], //")[0] 02/11/2016
		data.categories= breadcrumb.split("','")
	} catch (e) {
		console.log(e);
	}


	newObj = engine.clone(obj);
	if (newObj['MagasinId'] == 0){
		data.marque = $("a.logo-marque img").attr("alt");
	  var tampon = "";
	  data.caracteristique = [];
	  if ($("p.desc span").text().trim().length > 0){
	    tampon = $("p.desc span").text().trim();
	    tampon = outils.replaceAll('\r', '', tampon);
	    tampon = outils.replaceAll('\n', '', tampon);
	    tampon = outils.replaceAll('\t', ';', tampon);
	    data.caracteristique.push(tampon);
	  }
	  $("table.tech-desc tbody tr").each(function(){
	    tampon = $(this).find("td").text().trim();
	    tampon = outils.replaceAll('\r', '', tampon);
	    tampon = outils.replaceAll('\n', '', tampon);
	    tampon = outils.replaceAll('\t', ';', tampon);
	    data.caracteristique.push($(this).find("th").text().trim() + ' : ' + tampon);
	    if ($(this).find("th").text().trim() === 'Marque du produit'){
	      if (!data.marque || data.marque.length === 0) data.marque = tampon;
	    }
	  });
	}

	logger.logAttrVal("Fiche", "Start");
	logger.logAttrVal($('.showcase-product .price').text(),$(".ongletMag.ongletBanner .accountEntry .subTitle").text());
	console.log(data);
	logger.logAttrVal("Fiche", "End");
  engine.export_products(data, newObj);
}


function LM_RESULT_REQUEST(html, obj) {
	var $ = cheerio.load(html);

	if ($(".first").length > 0){
		var link = $(".clicCT").attr('href')
		logger.logTree(obj.id," IN", link);
		console.log(obj.jar);
		logger.logAttrVal("store")
		ReqObject = engine.clone(obj);
		engine.AddRequest(link, {}, {}, LM_FICHE, ReqObject);
	}else{
		logger.logAttrVal(obj.id," OUT");
	}
}


function LM_Prepare_Requests(html, obj) {
	var $ = cheerio.load(html);
	logger.logAttrVal('==>',$(".ongletMag.ongletBanner .accountEntry .subTitle").text());

//	logger.logValColor("#####");
	myEanLIST =engine.GetListEAN();
//	logger.logValColor("#####");

	search_link = 'http://www.leroymerlin.fr/v3/search-endeca/autosuggest.do?Ntt='

	for (var i = 0; i < myEanLIST.length; i++) {
		var link = search_link+myEanLIST[i]+'*'
		logger.logAttrVal("REQUEST",link);
		ReqObject = engine.clone(obj);
		ReqObject.id = myEanLIST[i];

		engine.BindRequest(link, {}, {}, LM_RESULT_REQUEST, ReqObject);
	}

}

function LeroyMerlin_SuppMagasin(obj){

  console.log("LEVEL SUPP MAG");

	SuppArray = []
  ObjMag1 = {};
  ObjMag2 = {};
  ObjMag3 = {};
  ObjMag4 = {};
  ObjMag5 = {};
  ObjMag6 = {};
	ObjMag7 = {};

  ObjMag1.link = "http://www.leroymerlin.fr/v3/p/magasins/quimper-l1401169373"
  ObjMag1.storeId = 181
  ObjMag1.name = 'Quimper'

  ObjMag2.link = "http://www.leroymerlin.fr/v3/p/magasins/meaux-l1401605790"
  ObjMag2.storeId = 185
  ObjMag2.name = 'Meaux'

  ObjMag3.link = "http://www.leroymerlin.fr/v3/p/magasins/reims-cormontreuil2-l1401286186"
  ObjMag3.storeId = 186
  ObjMag3.name = 'Reims (Cormontreuil)'

  ObjMag4.link = "http://www.leroymerlin.fr/v3/p/magasins/blois-l1401283079"
  ObjMag4.storeId = 187
  ObjMag4.name = 'Blois'

	ObjMag5.link = "http://www.leroymerlin.fr/v3/p/magasins/montauban-l1500271346"
  ObjMag5.storeId = 189
  ObjMag5.name = 'Montauban'
	/*            Mail de Vedastine du 16/02/2017 Magasin Paris 19 Rosa Parck            */
	ObjMag6.link = "https://www.leroymerlin.fr/v3/p/magasins/paris19-l1500501465"
	ObjMag6.storeId = 190
	ObjMag6.name = 'Paris 19 Rosa Parck'

  ObjMag7.link = "http://www.leroymerlin.fr/v3/p/magasins/beauvais-l1500296881"
  ObjMag7.storeId = 191
  ObjMag7.name = 'Beauvais'

  SuppArray.push(ObjMag1,ObjMag2,ObjMag3,ObjMag4,ObjMag5,ObjMag6,ObjMag7)

  SuppArray.forEach( function(elm){
    ReqObject = engine.clone(obj);
    ReqObject.tree = [];
    ReqObject.Magasin = elm.name;
    ReqObject.MagasinId = elm.storeId;
    ReqObject.jar["store"] = "store=" +  elm.storeId;
    if (elm.storeId && engine.shouldBeDone(elm.storeId)){
      logger.logTree(elm.link,elm.storeId,elm.name)
      engine.BindRequest(elm.link, {}, {}, LM_Prepare_Requests, ReqObject);
    }

  })
}

function LM_Patch(html, obj) {
	var $ = cheerio.load(html);

	obj = engine.clone(obj);
  //obj.https = undefined;
  //obj.public_ip = undefined;

	$(".notvisible a").each(function(idx){

		var MagasinId = $(this).attr('data-storeid');
		var MagasinName = $(this).attr('title');
		if (MagasinId) {
			var href =  $(this).attr('href');
			ReqObject = engine.clone(obj);
			ReqObject.tree = [];
			ReqObject.Magasin = MagasinName;
			ReqObject.MagasinId = MagasinId;
			ReqObject.jar["store"] = "store=" +  MagasinId;
			if (MagasinId && engine.shouldBeDone(MagasinId) && MagasinId!='57'){ //Doubon du mag Reims Cormontreuil
				logger.logTree(MagasinId,href,MagasinName)
				engine.BindRequest(href, {}, {}, LM_Prepare_Requests, ReqObject);
			}
		}
	});

	LeroyMerlin_SuppMagasin(obj)
}

function LM_OPEN_MAG_LIST(html, obj) {
	ReqObject = engine.clone(obj);
	ReqObject.tree = [];
	var hrefListMag = "/v3/p/magasins-l1308220543";
	engine.BindRequest(hrefListMag, {}, {}, LM_Patch, ReqObject);
}

function update(param) {
	var obj = {};
	obj.hostname = "www.leroymerlin.fr";
	obj.Enseigne = name;
	obj.https = true;
	obj.public_ip = true;
	obj.filter = param.filter;
	obj.filename = param.filename;
	engine.BindRequest("/", {}, {}, LM_OPEN_MAG_LIST, obj);
}

module.exports = {
	update: update
};
