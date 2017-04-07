var cheerio = require('cheerio');
var dateFormat = require('dateformat');
var Entities = require('html-entities').XmlEntities;
var outils = require("../engine/outils");

var name = "Castorama";


var xlblogger = require('xlblogger');
var logger = new xlblogger("Castorama");


/*function prettify_me(string) {
	return string.split("\n").join("").split("\r").join(";").trim();
}*/


function Castorama_GetDetailsArticle(html, obj) {
	var $ = cheerio.load(html);


	var product = $("div.productContent");

	//recuperation des donnees produit
	if (obj.skuDone !== true) {

		var len = $("select#multiskuPage > option:not(.selected)").each(function() {
			var sku = $(this).attr("value");
			// Ne pas prendre la fiche "Choisissez"
			if (sku && (sku.length > 0) && sku.indexOf('Choisissez')< 0 ){
				clone = engine.clone(obj);
				clone.skuDone = true;
				var url = clone.lasturl + "&skuId=" + sku;
				//console.log(url);
				//process.exit(0);
				engine.AddRequest(url, {}, {}, Castorama_GetDetailsArticle, clone);
			}
		}).length;
		if (len > 0) {
			/* we add all sku request the default one is not intresting */
			return;
		}

	} else {
		console.log("suceed from");
		console.log(obj.lasturl);
	}

	data = {};

	var idToTreat = product.find("span.refNum").text();
	var p = /([0-9]+)/;
	var match = p.exec(idToTreat);
	if (match) {
		data.idProduit = match[1];
	}

	data.marque = product.find("div.productLabel img").attr("title");

	data.libelles = [];
	data.libelles.push(product.find("h1").text().replace(/\n/g, " ").replace(/\r/g, " "));

	var priceBlock = $("div.productPrix.productDetailsPriceBlock");

	// simple case price
	data.prix = $(priceBlock).find("div.priceContent > div.price").text().trim();

	// promo sans oldprice mettre la mention PROMOTION 29/08/2016
	if($('.productImage .prodHighlightContent') && $('.productImage .prodHighlightContent').length > 0){
		var promo = $('.productImage .prodHighlightContent').text().trim()
		if(promo.indexOf('PROMOTION') < 0 && !(promo == 'Nouveauté')){
			data.promoDirecte = 'PROMOTION ' + promo
		}else{
			if(!(promo == 'Nouveauté'))
			data.promoDirecte = promo
		}
	}

	// simple promo
	if ($(priceBlock).find("div.priceContent > .oldprice").length > 0) {

		data.prixUnite = $(priceBlock).find(".priceContent > span.newprice").text().trim();
		data.promo = 1;
		data.prix = $(priceBlock).find(".priceContent > span.newprice").text().trim();
		data.ancienPrix = $(priceBlock).find(".priceContent > span.oldprice").text().trim();
		// promo sans oldprice mettre la mention PROMOTION 29/08/2016
		if($('.productImage .prodHighlightContent') && $('.productImage .prodHighlightContent').length > 0){
			data.promoDirecte = $('.productImage .prodHighlightContent').text().trim()
		}
		if(data.promoDirecte =='PROMOTION'){
			data.promoDirecte = data.promoDirecte +' '+ $(priceBlock).find(".discount").text();
		} else {
			data.promoDirecte = 'PROMOTION ' + $(priceBlock).find(".discount").text();
		}
	}
	if($(priceBlock).find(".discount") && $(priceBlock).find(".discount").length > 0){}

	var ttt = $(priceBlock).find("span.cardAddMess").text();
  var infoUnite = "";
	var patternConditionnement = /vendu en conditionnement de.(\d+(,\d{1,2})?)/;
	match = patternConditionnement.exec(ttt);
	if (match) {
		data.conditionnement = match[1];
		infoUnite = '/ Lot';
	}

	var patternPrix = /soit.(\d+(,\d{1,2})?)/;
	match = patternPrix.exec(ttt);
	if (match) {
		data.prixUnite = data.prix;
		data.prix = match[1] + infoUnite;
	}

	var entities = new Entities();
	var tttHTML = $(priceBlock).find(".additionalPrice").html();
	if (tttHTML) {
		ttt = entities.decode(tttHTML).replace(/\n/g, "").replace(/\r/g, "").trim();

		patternPrix = /soit. *(\d+(,\d{1,2})?) �\/l/;
		match = patternPrix.exec(ttt);
		if (match) {
			data.prixUnite = match[1];
		}
	}

	if (!data.prixUnite || data.prixUnite === "") {
		if ($(priceBlock).find(".priceContent > div.additionalPrice").text().trim().indexOf("recyclage") === -1)
		  data.prixUnite = $(priceBlock).find(".priceContent > div.additionalPrice").text().trim();
  }


	//recuperation du lien vers l'image du produit
	data.srcImage = $("div.productImage img").attr('src');
	//lien produit a recuperer
	data.lienProduit = obj.produitURL;
	data.isPremierPrix = (product.find("img[src='/images/brands/L_PREMIER_PRIX.jpg']").length > 0) ? 1 : 0;
	data.categories = obj.tree;
	data.timestamp = +(new Date());
	data.enseigne = obj['Enseigne'];
	data.magasin = obj['Magasin'];
	data.magasinId = obj['MagasinId'];
	data.idxProduit = engine.getidxProduit(obj.tree);
	data.ean = undefined;
	data.dispo = $("input.buttonCart").length ? 1 : 0;

	// Extraction des caractéristiques
	if (obj.MagasinId === '0'){
	  var Caracteristiques = $("div#tabs_pd_pagetechnicTab div.prodDescMarker").text().trim();
	  data.caracteristique = outils.prettify_me(Caracteristiques).split(";");
	}
	console.log(data);
	//process.exit(0);
	//logger.logAttrVal('DATA', data)
	engine.export_products(data, obj);
}

//Gets all articles and pushes them in the DB
function Castorama_GetArticles(html, obj) {
	var $ = cheerio.load(html);

	var list = $("div.productsRowTable > div.productsRow > div.productItem");

	if (!list.length) {
		console.log("There is no products in the category: " + obj.tree);
		console.log("In the store: " + obj['MagasinId'] + ": " + obj['Magasin'] + ", " + obj['Enseigne']);
		//engine.logError(obj.Enseigne, "0 products found ", obj);
	}

	newObj = engine.clone(obj);
	list.each(function() {

		//appel de la fonction getdetailArticle.

		var hrefProduit = $(this).find("div.illustration a").attr('href');


		if (hrefProduit && hrefProduit.length > 0) {
			newObj = engine.clone(obj);
			newObj.produitURL = hrefProduit;
			engine.AddRequest(hrefProduit, {}, {}, Castorama_GetDetailsArticle, newObj);
		}
	});
}

function Castorama_Pagination(html, obj) {
	var $ = cheerio.load(html);
	var pagination = $("div.paginator > div > div.suivantDivProds > a");

	Castorama_GetArticles(html, obj);
	if (pagination.length) {
		var url = pagination.attr('href');

		engine.AddRequest(url, {}, {}, Castorama_Pagination, obj);
	}
}

function Castorama_SubNavigation(html, obj) {
	var $ = cheerio.load(html);
	//var list = $("div.productsListLayer > div.productsListLayerInside > div.productsListLayerLine > div.productsListItem > div > div.productTitle > h2 > a");
	var list = $("div.productsListLayer > div.productsListLayerInside div.productsListItem");
	//console.log(list.html());
	obj = engine.clone(obj);
	obj.attach_client = true;
	var match = list.each(function(idx) {
		//var n_next = $(this).text().split("\r")[0].trim();
		//var url = $(this).attr('href');
		//console.log($(this).find("a h2").text().split("\r"));
		var n_next = $(this).find("a h2").text().split("\r")[1].trim();
		var url = $(this).find("a").attr("href");

		newObj = engine.clone(obj);
		newObj.tree.push(n_next);
		newObj.idxProduit = 0;
		console.log('resultat = ', n_next, url);
		engine.AddRequest(url, {}, {}, Castorama_SubNavigation, newObj);
	}).length;

	if (match === 0) {
		Castorama_Pagination(html, obj);
	}
	//process.exit(0);
}

//Gets main categories
function Castorama_Navigation(html, obj) {
	var $ = cheerio.load(html);
	$("div#navPane > div.mainNavPanel > ul.mainMenuUL > li").each(function(idx) {
		//var n1 = $(this).find("img.menuBgImg").attr('alt');
		var n1 = $(this).find(".mm_t01_lnk").text().trim();

		if (n1 ) {
			logger.logAttrVal('N1', n1)
			//if ($(this).find("div.upperMenuPopup > div.menuContainer > ul > li > a").length) { // Modif. le 28/11/2016
			//if ($(this).find(" div.menuContainer > ul > li > a").length) {
				//$(this).find("div.upperMenuPopup > div.menuContainer > ul > li > a").each(function() { // Modif. le 28/11/2016
				$(this).find(" div.menuContainer > ul > .mm_t01_sub_lnk ").each(function() {
					var n2 = $(this).find('> a').text().trim();
					var url = $(this).find(' > a').attr('href');

					newObj = engine.clone(obj);
					newObj.tree.push(n1);
					newObj.tree.push(n2);
					logger.logTree(n1, n2, url);
					
					engine.AddRequest(url, {}, {}, Castorama_SubNavigation, newObj);
				});
			/*} else {
				var url = $(this).find('a').attr('href');

				newObj = engine.clone(obj);
				newObj.tree.push(n1);
				logger.logAttrVal(n1, url);
				return
				engine.AddRequest(url, {}, {}, Castorama_SubNavigation, newObj);
			}*/

		}
	});
	//process.exit(0);
}


function Castorama_PatchMagasin2(html, obj) {
	//console.log('retour chez casto', obj.jar.s_cdao);
	//process.exit(0);
	var clone = engine.clone(obj);
	logger.logAttrVal("inside magasin", clone.MagasinId);

	//clone.jar["s_cdao"] = clone.CodeMagasinCasto;
	clone.jar.s_cdao = clone.CodeMagasinCasto;
	//engine.AddRequest("/store/Salle-de-bains-et-WC-cat_id_3322.htm?navAction=jump&wrap=true", {}, {}, Castorama_Navigation, clone);
	//engine.AddRequest("/store/Colle-en-pate-Hautes-performances-murs-sols-20-kg-PRDm498108.html?isSearchResult=true&navAction=jump", {}, {}, Castorama_GetDetailsArticle, clone);

/* !!!!!  */ 	engine.AddRequest("/store/", {}, {}, Castorama_Navigation, clone);
//DEV AND DEBUG
//engine.AddRequest("http://www.castorama.fr/store/Perceuse-visseuse-sans-fil-a-percussion-SKIL-18V---12Ah-prod20380008.html?isFeaturedProduct=true&categoryId=cat_id_4338&navCount=0&navAction=jump", {}, {}, Castorama_GetDetailsArticle, clone);
//engine.AddRequest("http://www.castorama.fr/store/Perceuse-visseuse-sans-fil-cat_id_2182.htm?navAction=jump&navCount=0", {}, {}, Castorama_Pagination, clone);
}

function Castorama_TraiterMagasin(html, obj) {
	var $ = cheerio.load(html);
	var url = $("div.mem-store-button a").attr("href");
	var pattern = /[0-9]+/;
	var codeMagasin = pattern.exec(url) ? pattern.exec(url)[0] : "";
	//console.log('dedans ', obj.MagasinId);
		//process.exit(0);
  /*if (obj.MagasinId == "4234" || obj.MagasinId == "4252") {
		console.log('dedans');
		process.exit(0);*/
	if (url && engine.shouldBeDone(obj.MagasinId)) {
		var clone = engine.clone(obj);
		//clone.MagasinId = codeMagasin;
		clone.CodeMagasinCasto = codeMagasin;
		//clone.MagasinId = codeMagasin;
		clone.tree = [];
		console.log('=====> Traitement mag ' + clone.MagasinId + ' - ' + clone.Magasin);
		console.log('=====> url = ' + url);
		logger.logAttrVal("start magasin", clone.MagasinId);

		clone.jar.s_cdao = clone.CodeMagasinCasto;
		//var options = {};
		//options["destroyCookie"] = 1;
		clone.use_request_jar = true;
		//clone.jar["s_cdao"] = codeMagasin;
		//url = "/store/";
		//engine.AddRequest(url, {}, {}, Castorama_Navigation, clone);
		//engine.BindRequest(url, {}, {}, Castorama_PatchMagasin, clone);

		engine.BindRequest(url, {}, {}, Castorama_PatchMagasin2, clone);
	}

}

function Castorama_ParseMagasins(html, obj) {
	logger.logAttrVal("Level", "ParseMagasins");

	var MagToDo = outils.FileToArray(LINK_MAG_FILE)

	logger.logAttrVal("####","####");
	console.log(MagToDo);
	logger.logAttrVal("####","####");

	try {
		json = JSON.parse(html);
	} catch (err) {
		engine.logError(obj, "json parse error ");
		return;
	}

	var listeMagasins = json["points_of_sale"]["France"];

	for (var elm in listeMagasins) {
		var clone = engine.clone(obj);
		clone.MagasinId = elm;
		clone.Magasin = listeMagasins[elm].name;
		if (engine.shouldBeDone(clone.MagasinId)) {
				logger.logAttrVal("magasin to do ",elm);

				if (MagToDo.indexOf(elm) > -1) {
					logger.logTree("CONCRET","magasin to do ",elm);
					engine.AddRequest('magasins.castorama.fr/' + listeMagasins[elm].url, {}, {}, Castorama_TraiterMagasin, clone);
				}
			}
	}

}

function Castorama_Patch(html, obj) {
	logger.logAttrVal("Level", "Patch");
	// On aspire tous les magasins Castorama
	var clone = engine.clone(obj);
	engine.BindRequest("magasins.castorama.fr/point_of_sales.json", {}, {}, Castorama_ParseMagasins, clone);
}

function Castorama_Patch0(html, obj) {
	logger.logAttrVal("Level", "ZERO_Patch");

	// On aspire le magasin Web
	if (engine.shouldBeDone(0)){
	  clone = engine.clone(obj);
	  clone.MagasinId = '0';
	  clone.Magasin = 'Castorama Web';
	  engine.AddRequest("/store/", {}, {}, Castorama_Navigation, clone);
	}

}


function update(param) {
	var obj = {};
	obj.hostname = "www.castorama.fr";
	obj.Enseigne = name;
	obj.tree = [];
	logger.logAttrVal('PID',  obj.Enseigne +' / ' +process.pid)
	logger.stopLog()

	if (process.argv.length === 3 ) {
		logger.logAttrVal("SCRAP", "MAGASIN ZERO");
		engine.BindRequest("/", {}, {}, Castorama_Patch0, obj);
	}else {
		if (process.argv.length === 4){
			LINK_MAG_FILE = process.argv[3];
			logger.logAttrVal("SCRAP", "LIST IN FILE: "+LINK_MAG_FILE);
			engine.BindRequest("/", {}, {}, Castorama_Patch, obj);

		}
	}
}


/*
process.on('uncaughtException', function(err) {
  logger.logAttrVal("uncaughtException",err);
  console.log(err);
});*/

module.exports = {
	update: update
};
