//
// Bricoman.js for OptiMix
// CHELBI - Ahmed
//


var xlblogger = require('xlblogger');
var logger = new xlblogger("Bricoman");
var cheerio = require('cheerio');
var dateFormat = require('dateformat');
var outils = require("../engine/outils");
var name = "Bricoman";


function Bricoman_Fiche(html, obj) {
	var $ = cheerio.load(html);
	logger.logValColor('*********Fiche**************')
	ReqObject = engine.clone(obj);


	/* ------------------------------------------------------------------------ */
	// manage fail
	if ($('.std .top-content').text().trim() == "Produit non disponible") {

		process.send({
			requestID  :  ReqObject.requestID,
			error      :	"produit non disponible",
			data       :  undefined
		})

		process.exit(1); // important !!
	}
	/* ------------------------------------------------------------------------ */


	data = {};
	data.enseigne = obj['Enseigne'];
	data.magasin = obj['Magasin'];
	data.magasinId = obj['MagasinId'];
	data.categories = []

	try {
		data.marque = html.split('"marque":"')[1].split('","')[0]
	} catch (e) {
		if (html.split('"brand":"')[1]) {
			data.marque = html.split('"brand":"')[1].split('","')[0]
		}else {
			data.marque = ""
		}
	}

	data.srcImage = $("[itemprop='image']").attr('src')
	data.libelles = [];
	data.libelles.push($(".product-name [itemprop='name']").text().trim());

	try {
		data.idProduit = html.split('"sku":"')[1].split('","')[0]
	} catch (e) {
		data.idProduit = ""
	}

	try {
		data.ean =  html.split('"ean_code":"')[1].split('","')[0]
	} catch (e) {
		data.ean = undefined;
	}


	$(".breadcrumbs [class*='category']").each(function (i) {
		data.categories.push($(this).find("[itemprop='item']").attr('title'))
		logger.logAttrVal('Cat: ', data.categories[i] )
	})



	data.prix = $(".item-price [itemprop='price']").text().trim().replace(/  /g,"");
	if ($(".item-price .old-price").length > 0) {
		console.log("HAVE OLD PRICE");
		data.ancienPrix = $(".item-price  p.old-price span.price span").first().text().trim()
	}
	data.prixUnite = $(".item-price  .unit").first().text().trim()
	//data.categories = obj.tree;
	data.timestamp = +(new Date());
	data.promo = data.ancienPrix ? 1 : 0;
	data.promoDirecte = data.promo;
	data.dispo = ($(".availability.in-stock .label").text().indexOf('En stock') > 0) ? 1 : 0;
	data.caracteristique = [];

	$(".product-attributes-container .first").each(function () {
		var attribut = $(this).find('.label').text().trim();
		var valeur = $(this).find('.data').text().trim();
		data.caracteristique.push(attribut+" = "+valeur);
		// Conditionnement
		//logger.logValColor((attribut.indexOf('Contenance') >= 0 && valeur !='0') ? 1 : 0)

		if (attribut.indexOf('Contenance') >= 0 && valeur !='0' ) {
			data.conditionnement = valeur

		}else if (attribut.indexOf('Conditionnement') >= 0 && valeur !='0' && !data.conditionnement) {
			data.conditionnement = valeur

		}
	})


	text = $("[itemprop='description']").text().trim()
	text = text.replace(/\n/g, "").replace(/\t/g, "").trim()

	round = Math.ceil(text.length / 499);
	console.log(round);

	// we have to split the description into portions of 500 char in order to fit in the table
	var dep = 0
	for (var i = 0; i < round-1; i++) {
		console.log("from "+dep+" to "+(dep+499));
		var portion = text.substring(dep,(dep+499));
		logger.logAttrVal("Portion "+i+":",portion);
		data.caracteristique.push(portion);
		dep=dep+499;
	}
	console.log("from "+dep+" to "+text.length);
	var portion = text.substring(dep,(text.length));
	logger.logAttrVal("Portion "+i+":",portion);
	data.caracteristique.push(portion);


	if (data.caracteristique.length > 59) {
		logger.logAttrVal("NUMBER OF CARAC +"+data.caracteristique.length,obj.lasturl);
	}


	//process.send({requestID:ReqObject.requestID,data:undefined}) // fail status test
	process.send({
		requestID : ReqObject.requestID,
		data			: data
	})

}

function HomeMag(html, obj) {
	var $ = cheerio.load(html);
	logger.logValColor('***********[HOME '+obj.MagasinId+']***********')
	logger.logValColor($(".label span").first().text().trim())
	newObj = engine.clone(obj);
	console.log(newObj.lookup);
	engine.AddRequest(newObj.lookup, {}, {}, Bricoman_Fiche, newObj);
	//engine.AddRequest("https://www.bricoman.fr/joint-de-dilatation-pvc.html", {}, {}, Bricoman_Fiche, obj);

}

function Patch_magIN(html, obj) {
	var $ = cheerio.load(html);
	logger.logValColor('***********[AFTER POST'+obj.MagasinId+']***********')
	Req= engine.clone(obj);
	engine.AddRequest('/', {}, {}, HomeMag, Req);
}

function Bricoman_MagasinList(html, obj) {
	var $ = cheerio.load(html);
	var magArrayObj = {}

	$("[id='shop_chooser_modal'] option").each(function(idx) {
		if ($(this).attr('value').length < 4) {
			var MagasinName = $(this).text().trim();
		/* ************* Modification  ********************/
			//	var MagasinId = $(this).attr('value')
			var MagasinId = $(this).attr('data-shop-id')
			magArrayObj[MagasinName.toString()] = MagasinId
		}
	});

	$("[id='shop_chooser'] option").each(function(idx) {
		var url = $(this).attr('value')
		var Magasin =  $(this).text().trim()
		var MagasinId =  $(this).attr('data-shop-id')

		logger.logTree(Magasin, url ,MagasinId)

		//// DEV AND DEBUG ////////
		if(MagasinId == obj.MagId){

					console.log("Entrer dans le magasin " + MagasinId)
					ReqObject = engine.clone(obj);
					ReqObject.tree = [];
					ReqObject.Magasin = Magasin;
					ReqObject.MagasinId = MagasinId;
					ReqObject.tmpurl = url;

					var cookie = 'smile_retailershop_id='+MagasinId;
					ReqObject.xlbSetJar = cookie;
					engine.BindRequest(url, {}, {}, Patch_magIN, ReqObject);

				/*  Test *********************/
				//		engine.AddRequest('https://www.bricoman.fr/gros-oeuvre.html', {}, {},Bricorama_Fiche1, ReqObject);

		}
	});
}

function update(param) {
	var obj = {};
	obj.https      = true;
	obj.public_ip  = true;
	obj.hostname   = "www.bricoman.fr";
	obj.filename   = param.filename;

	obj.Enseigne 	 = param.Enseigne;
	obj.MagId  		 = param.MagasinId; // dont set obj.MagasinId at this level
	obj.lookup		 = param.url;
	obj.requestID	 = param.requestID;

	console.log(param);
	engine.BindRequest("https://www.bricoman.fr/nos-magasins.html", {}, {}, Bricoman_MagasinList, obj);
}

function debug(param) {
	var obj = {};
	obj.https = true;
	obj.public_ip = true;
	obj.hostname = "www.bricoman.fr";
	obj.filename = param.filename;
	obj.Enseigne = 'Bricoman';
	obj.MagId = '1'; // dont set obj.MagasinId at this level
	obj.lookup = 'https://www.bricoman.fr/joint-de-dilatation-pvc.html';
	obj.requestID = 0;

	engine.BindRequest("https://www.bricoman.fr/nos-magasins.html", {}, {}, Bricoman_MagasinList, obj);
}

module.exports = {
	update: update,
	debug : debug
};
