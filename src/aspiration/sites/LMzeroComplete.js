//
// LMzeroComplete.js for OptiMix
// CHELBI Ahmed
//


var cheerio = require('cheerio');
var dateFormat = require('dateformat');
var fs = require("fs");
var outils = require("../engine/outils");

var name = "Centrale Leroy Merlin";
var urlparse = require("url");
var htmlToText = require('html-to-text');

var xlblogger = require('xlblogger');
var logger = new xlblogger("LMzeroComplete");

function LM_FICHE(html, obj) {
	var $ = cheerio.load(html);

	if ($('[property="og:type"]').attr('content') !== 'product') {
		logger.logAttrVal(obj.id,' does not land on a product page ')
		return;
	}

	data = {};
	data.timestamp = +(new Date());
	data.enseigne = obj['Enseigne'];
	data.magasin = obj['Magasin'];
	data.magasinId = obj['MagasinId'];
	data.srcImage = $('#img-01').attr('src')
	data.libelles = []
	data.libelles.push($("[itemprop='name']").text().trim());
	data.libelles.push($(".showcase-product span.picto-marque").text().trim()) // 14/06/2016 info sur le prix expl: 1er prix / Prix Haute Qualité

  var infos_stores = htmlToText.fromString($('.infos-stores').html(), { wordwrap: false }).replace(/\n/g," ");
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
		var breadcrumb = html.split("product_breadcrumb_label : ['")[1].split("']")[0]  //  var breadcrumb = html.split("product_breadcrumb_label : ['")[1].split("'], //")[0] 31/10/2016
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
			if ($(this).find("th").text().indexOf('Contenance') >= 0) {
	      data.conditionnement = $(this).find('td').text().trim()
	    }else if ($(this).find("th").text().indexOf('Conditionnement') >= 0 && !data.conditionnement) {
	      data.conditionnement = $(this).find('td').text().trim()
	    }
	  });
	}

	logger.logAttrVal("Fiche", "Start");
	console.log(data);
	logger.logAttrVal("Fiche", "End");
  engine.export_products(data, newObj);
}

function LM_RESULT_REQUEST(html, obj) {
	var $ = cheerio.load(html);

	if ($(".first").length > 0){
		var link = $(".clicCT").attr('href')
		logger.logTree(obj.id," IN", link);
		ReqObject = engine.clone(obj);
		engine.AddRequest(link, {}, {}, LM_FICHE, ReqObject);
	}else{
		logger.logAttrVal(obj.id," OUT");
	}
}


function LM_Prepare_Request(html, obj) {

//	logger.logValColor("#####");
	myEanLIST =engine.GetListEAN();
//	logger.logValColor("#####");

	search_link = 'http://www.leroymerlin.fr/v3/search-endeca/autosuggest.do?Ntt='

	for (var i = 0; i < myEanLIST.length; i++) {
		var link = search_link+myEanLIST[i]+'*'
		logger.logAttrVal("REQUEST",link);
		ReqObject = engine.clone(obj);
		ReqObject.id = myEanLIST[i];
		ReqObject.Magasin = name;
		ReqObject.MagasinId = 0;
		engine.BindRequest(link, {}, {}, LM_RESULT_REQUEST, ReqObject);
	}
}

function LM_Patch(html, obj) {
		ReqObject = engine.clone(obj);
		ReqObject.tree = [];
		ReqObject.Magasin = name;
		ReqObject.MagasinId = 0;
		engine.BindRequest('/', {}, {}, LM_Prepare_Request, ReqObject);
}

function update(param) {
	var obj = {};
	obj.hostname = "www.leroymerlin.fr";
	obj.Enseigne = 'LeroyMerlin';
	obj.filter = param.filter;
	obj.filename = param.filename;
	obj.https = true;
	obj.public_ip = true;
	engine.BindRequest("/", {}, {}, LM_Patch, obj);
}

module.exports = {
	update: update
};
