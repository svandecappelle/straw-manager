//
// Bricoman.js for OptiMix
// CHELBI - Ahmed
//

(function (Bricoman) {
    "use strict";

	console.red = function(text){
	    console.log("[31m" + text + "[0m");
	}

    var name = "Bricoman",
    	xlblogger = require('xlblogger'),
    	//logger = new xlblogger("Bricoman"),
		cheerio = require('cheerio'),
		path = require('path'),
		dateFormat = require('dateformat'),
		logger = require("log4js").getLogger('sites/' + name),
		outils = require("../engine/outils");
		

	Bricoman.Bricoman_Fiche = function(html, obj) {
		var $ = cheerio.load(html);
		logger.debug('*********Fiche**************')
		var ReqObject = engine.clone(obj);


		/* ------------------------------------------------------------------------ */
		// manage fail
		if ($('.std .top-content').text().trim() == "Produit non disponible") {
			var output = {
				requestID  :  ReqObject.requestID,
				error      :	"produit non disponible",
				data       :  undefined
			};
			if (process.send){
				process.send(output);
				process.exit(1); // important !!
			}
			if (this.callback){
				this.callback(output);
			}
		}
		/* ------------------------------------------------------------------------ */


		var data = {};
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
			logger.debug('Cat: ', data.categories[i] )
		})



		data.prix = $(".item-price [itemprop='price']").text().trim().replace(/  /g,"");
		if ($(".item-price .old-price").length > 0) {
			logger.debug("HAVE OLD PRICE");
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

			} else if (attribut.indexOf('Conditionnement') >= 0 && valeur !='0' && !data.conditionnement) {
				data.conditionnement = valeur

			}
		})


		var text = $("[itemprop='description']").text().trim()
		text = text.replace(/\n/g, "").replace(/\t/g, "").trim()

		var round = Math.ceil(text.length / 499);
		logger.debug(round);

		// we have to split the description into portions of 500 char in order to fit in the table
		var dep = 0
		for (var i = 0; i < round-1; i++) {
			logger.debug("from "+dep+" to "+(dep+499));
			var portion = text.substring(dep,(dep+499));
			logger.debug("Portion "+i+":",portion);
			data.caracteristique.push(portion);
			dep=dep+499;
		}
		logger.debug("from "+dep+" to "+text.length);
		var portion = text.substring(dep,(text.length));
		logger.debug("Portion "+i+":",portion);
		data.caracteristique.push(portion);


		if (data.caracteristique.length > 59) {
			logger.debug("NUMBER OF CARAC +"+data.caracteristique.length,obj.lasturl);
		}


		//process.send({requestID:ReqObject.requestID,data:undefined}) // fail status test
		var output = {
			requestID : ReqObject.requestID,
			data			: data
		};

		if (Bricoman.callback){
			Bricoman.callback(output);
		}

		if (process.send){
			process.send(output);
		}


	};

	Bricoman.HomeMag = function(html, obj) {
		var $ = cheerio.load(html);
		logger.debug('***********[HOME '+obj.MagasinId+']***********')
		logger.debug($(".label span").first().text().trim())
		var newObj = engine.clone(obj);
		logger.debug(newObj.lookup);
		engine.AddRequest(newObj.lookup, {}, {}, Bricoman.Bricoman_Fiche, newObj);

	};

	Bricoman.Patch_magIN = function(html, obj) {
		var $ = cheerio.load(html);
		logger.debug("Rentré dans Bricoman_MagasinList");
		logger.debug('***********[AFTER POST'+obj.MagasinId+']***********')
		var Req = engine.clone(obj);
		engine.AddRequest('/', {}, {}, Bricoman.HomeMag, Req);
	};

	Bricoman.Bricoman_MagasinList = function(html, obj) {
		var $ = cheerio.load(html);
		var magArrayObj = {};

		logger.debug("Rentré dans Bricoman_MagasinList");

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

			logger.debug(Magasin, url ,MagasinId)

			//// DEV AND DEBUG ////////
			if(MagasinId == obj.MagId){

				logger.debug("Entrer dans le magasin " + MagasinId)
				var ReqObject = engine.clone(obj);
				ReqObject.tree = [];
				ReqObject.Magasin = Magasin;
				ReqObject.MagasinId = MagasinId;
				ReqObject.tmpurl = url;

				var cookie = 'smile_retailershop_id='+MagasinId;
				ReqObject.xlbSetJar = cookie;
				
				// engine.BindRequest(url, {}, {}, that.Patch_magIN, ReqObject);
				engine.BindRequest(url, {}, {}, Bricoman.Patch_magIN, ReqObject);
			}
		});
	};

	Bricoman.update = function(param, callback) {
		engine._init(param.Enseigne);
		Bricoman.callback = callback;

		var obj = {};
		obj.https      = true;
		obj.public_ip  = true;
		obj.hostname   = "www.bricoman.fr";
		obj.filename   = param.filename;

		obj.Enseigne 	 = param.Enseigne;
		obj.MagId  		 = param.MagasinId; // dont set obj.MagasinId at this level
		obj.lookup		 = param.url;
		obj.requestID	 = param.requestID;
		engine.BindRequest("https://www.bricoman.fr/nos-magasins.html", {}, {}, Bricoman.Bricoman_MagasinList, obj);
	};

	Bricoman.debug = function(param) {
		engine._init(param.Enseigne);

		var obj = {};
		obj.https = true;
		obj.public_ip = true;
		obj.hostname = "www.bricoman.fr";
		obj.filename = param.filename;
		obj.Enseigne = 'Bricoman';
		obj.MagId = '1'; // dont set obj.MagasinId at this level
		obj.lookup = 'https://www.bricoman.fr/joint-de-dilatation-pvc.html';
		obj.requestID = 0;

		engine.BindRequest("https://www.bricoman.fr/nos-magasins.html", {}, {}, Bricoman.Bricoman_MagasinList, obj);
	};
}(exports));