var cheerio = require('cheerio');
var dateFormat = require('dateformat');
var outils = require("../engine/outils");
var xlblogger = require('xlblogger');

var htmlToText = require('html-to-text');


var logger = new xlblogger("LeroyMerlin");


var name = "LeroyMerlin";

/* MANAGE CONTACT */
require("date-format-lite");
var now = new Date();
var levelOne = now.format("W");
DIRECTORY = process.argv[2]
PATH = 'D:/Out_Aspiration_2/'+levelOne+'/Contact/'
var contact = new xlblogger(DIRECTORY,PATH);
/*   */


function prettify_me(string) {
    return string.split("\n").join("").split("\r").join("").trim();
}

function LeroyMerlin_GetDetailArticles(html, obj){
  var $ = cheerio.load(html);
  newObj = engine.clone(obj);
  data = []

  if ($('div.infos-stores p span').length < 1) {

    process.send({
      requestID  :  newObj.requestID,
      error      :	"produit non disponible",
      data       :  undefined
    })

    process.exit(1); // important !!
  }

  data.timestamp = +(new Date());
  data.enseigne = newObj['Enseigne'];
  data.magasin = newObj['Magasin'];
  data.magasinId = newObj['MagasinId'];

  data.ean = undefined;
  data.marque = $("a.logo-marque img").attr("alt");
  //var resultat = /^\/recherche=([A-Z0-9-' .]+)$/.exec($("a.logo-marque").attr("href"));
  //if (resultat && resultat.length > 0) data.marque = resultat[1];
  // On charge les caractéristiques du produit
  var tampon = "";

  data.categories = []
   $('ul.breadcrumb a').each(function (i, elm){
      if(i>1){
        logger.logAttrVal('text',$(this).text())
        data.categories.push($(this).text())
      }
       //if(($(this).attr('class')!='home') && ($(this).attr('class')!='product'))
       //data.categories.push($(this).text().replace('\n',' ').replace('>',' ').trim())
   })

  data.caracteristique = [];
  if ($("p.desc span").text().trim().length > 0){
    tampon = $("p.desc span").text().trim();
    tampon = outils.replaceAll('\r', '', tampon);
    tampon = outils.replaceAll('\n', '', tampon);
    tampon = outils.replaceAll('\t', ';', tampon);
    data.caracteristique.push(tampon);
  }


  data.promo = 0;
  data.prix = $('p.price').first().text().trim();
  data.prixUnite = $('p.price').first().text().trim();
  if($('span[class="picto-marque promo"]').first().text().length > 0) {
    data.promo = 1;
      data.ancienPrix = $('p.infos em.barred em').first().text().trim()

  }
  data.libelles = []
  data.libelles.push($('header h1').first().text().trim())

  data.srcImage = $('a.active img').first().attr('src')
  //var a = $(this).find("h3 > a").first(); // length > 100 => update : added 'first' 19/01/2016


  var a = $(this).find(".label-produit") // infinite cycle  undefined label
  if (a.length < 1) {
    a = $(this).find('[itemprop="name"]')
  }

  $("table.tech-desc tbody tr").each(function(){
    tampon = $(this).find("td").text().trim();
    tampon = outils.replaceAll('\r', '', tampon);
    tampon = outils.replaceAll('\n', '', tampon);
    tampon = outils.replaceAll('\t', ';', tampon);
    data.caracteristique.push($(this).find("th").text().trim() + ' : ' + tampon);
    // Conditionnement 02/03/2017
    if ($(this).find("th").text().trim() === 'Marque du produit'){
      if (!data.marque || data.marque.length === 0) data.marque = tampon;
    }
    if ($(this).find("th").text().indexOf('Contenance') >= 0) {
      data.conditionnement = $(this).find('td').text().trim()
    }else if ($(this).find("th").text().indexOf('Conditionnement') >= 0 && !data.conditionnement) {
      data.conditionnement = $(this).find('td').text().trim()
    }
  });
  //console.log(data.caracteristique);
  //process.exit(0);
  logger.logValColor('Export zero')

  logger.logAttrVal("DATA", "BEGIN")
  console.log(data);
  logger.logAttrVal("DATA", "END")

   //process.send({requestID:ReqObject.requestID,data:undefined}) // fail status test
  process.send({
     requestID : newObj.requestID,
     data			: data
   })
  //engine.export_products(data, newObj);
}

function LeroyMerlin_GetArticles(html, obj){

  var $ = cheerio.load(html);
  var list = $("section#showcase > div");
  if (!list.length) {
  	//console.log("There is no products in the category: " + obj.tree);
    //console.log("In the store: " + obj['MagasinId'] + ": " + obj['Magasin'] + ", " + obj['Enseigne']);
  	//engine.logError(obj.Enseigne, "0 products found ", obj);

    // On vérifie qu'il ne s'agit pas d'une étape particulière
    //console.log('dans cas particulier');
    //process.exit(0);
    $("div.infos-pdt a").each(function (elm){
      //console.log(elm.href);
      newObj = engine.clone(obj);
      engine.AddRequest($(this).attr("href"), {}, {}, LeroyMerlin_GetArticles, newObj);
    });
  }
  else {
    console.red(obj.lasturl);
    newObj = engine.clone(obj);
    var len = list.each(function(idx) {
  	  data = {};
	    data.promo = 0;
	    data.prix = $(this).find(".price-wrapper > .price > [itemprop='price']").text().trim();
	    if (!data.prix){
        data.prix = $(this).find(".prd-price > .price-wrapper > .price").text().trim();
  	  }

	    data.prixUnite = $(this).find(".prd-price > .price-wrapper > p.infos > em.infos.capacity").text().trim();
	    data.promoDiff = undefined;
	    if ($(this).find(".price-wrapper p.infos em.barred").length > 0){
	      data.ancienPrix = $(this).find(".price-wrapper p.infos em.barred em").text().trim();
	      data.promo = 1;
        logger.logAttrVal('data Promo', data.promoDirecte)
        var promoD = $(this).find("span.picto-marque.promo ").text().trim()
        logger.logTree('PromoD', promoD, promoD.length)
        if(promoD=='' || promoD.length <1){
          logger.logValColor('pas de promotion')
        }else{
          data.promoDirecte = 'Promotion '+promoD
        }

        if (data.prixUnite.length < 1) { /* update 27-11-2o15 */
          data.prixUnite = $(this).find(".infos.capacity").text().trim();
        }
	    }
  	  data.srcImage = $(this).find("img.img-noscript").attr('src');
  	  //var a = $(this).find("h3 > a").first(); // length > 100 => update : added 'first' 19/01/2016


      var a = $(this).find(".label-produit") // infinite cycle  undefined label
      if (a.length < 1) {
        a = $(this).find('[itemprop="name"]')
      }

      //	logger.logValColor(a.text())
      //  process.exit(0)

      if (!a || a == null || a =='null'){
    		ReloadA = engine.clone(obj)
    		logger.logTree('Problème chargement de page (a): ', !$("[itemprop='name']").text().trim(), html)
    		engine.AddRequest(Reload.lasturl, {}, {}, LeroyMerlin_GetArticles, ReloadA);
    	}
	    data.lienProduit = $(this).find(".product-infos a.clicCT").attr('href')
      if (!data.lienProduit) { //13/01/2017
        data.lienProduit = $(this).find('.prd-visuel a').attr('href')
      }
      newObj.force_url_prod = data.lienProduit;
      data.libelles = [a.text().trim()];
      logger.logAttrVal('new label', a.text().trim())

      //  data.libelles.push($(this).find("figure.prd-visuel > span.picto-marque > strong").text().trim()); // 05/02/2016
      data.libelles.push($(this).find("span.picto-marque").text().trim()); // 05/02/2016 info sur le prix expl: 1er prix / Prix Haute Qualité

      var infos_stores = htmlToText.fromString($(this).find('.infos-stores').html(), { wordwrap: false }).replace(/\n/g," ");
      if (infos_stores.indexOf("Changer de magasin") > 0) infos_stores = infos_stores.split('Changer de magasin')[0].trim();
      /*if (!infos_stores || infos_stores == null || infos_stores == 'null'){
        Reload = engine.clone(obj)
        logger.logTree('Problème chargement de page (infos_stores): ', !$("[itemprop='name']").text().trim(), html)
        engine.AddRequest(Reload.lasturl, {}, {}, LeroyMerlin_GetArticles, Reload);
      }*/
      if (infos_stores == 'null')
        infos_stores = undefined;
      data.libelles.push(infos_stores)


	    data.idProduit = $(this).find("a[data-reflm]").attr("data-reflm");
	    if (!data.idProduit){
	      var patternID = new RegExp("R.f.([0-9]+)");
	      var txt = $(this).find("section > em").text().trim();
	      data.idProduit = patternID.exec(txt) ? patternID.exec(txt)[1] : "";
	    }
      if (!data.idProduit) return;
	    data.categories= newObj.tree;
	    data.timestamp = +(new Date());
	    data.enseigne = newObj['Enseigne'];
	    data.magasin = newObj['Magasin'];
	    data.magasinId = newObj['MagasinId'];
	    data.idxProduit = engine.getidxProduit(newObj.tree);
	    data.ean = undefined;
      data.dispo = ($(this).find(".form-add-to-cart").length > 0)? 1 : 0;
      logger.logAttrVal("Fiche", "Start");
      console.log(data);
      //logger.logValColor(data);
      logger.logAttrVal("Fiche", "End");

      if (newObj['MagasinId'] == 0){

        // Pour le magasin central, on va chercher des informations supplémentaires
        // dans un soucis de performance on ne le fais que sur ce magasin
        // on recopiera par sql les informations ensuite pour les autres magasins
        newObj.data = data;
        engine.AddRequest(data.lienProduit, {}, {}, LeroyMerlin_GetDetailArticles, newObj);
      } else{

        ReloadX = engine.clone(newObj)
        ReloadX.TestLib = false
        if(!data.libelles[0] || data.libelles[0]== undefined || data.libelles[0]== null || data.libelles =='null'){
          logger.logAttrVal('Pas de Lib !! N° ' + idx, data)
          //logger.logAttrVal(newObj.lasturl, html)
          Reload = engine.clone(ReloadX)
          Reload.TestLib = true
          engine.AddRequest(Reload.lasturl, {}, {}, LeroyMerlin_GetArticles, Reload);
        }else if((!data.prix || data.prix=='null') && (obj.TestPrix < 1)){

          logger.logAttrVal('Pas de Prix !! N° ' + idx, data)
          ReloadP = engine.clone(ReloadX)
          ReloadP.TestPrix ++
          engine.AddRequest(ReloadP.lasturl, {}, {}, LeroyMerlin_GetArticles, ReloadP);

        }else {
          if(ReloadX.TestLib || ReloadX.TestPrix){
            logger.logAttrVal('Reloaded ' , data.idProduit)
          }

          logger.logAttrVal('Export ' , data.idProduit)
          engine.export_products(data, ReloadX);
        }
      }

    }).length;

    var pagination = $("ul.pagination > li:not(.active) > a");
    pagination.each(function() {
	    if ($(this).find("i.ico-arrow-right").length > 0){
  	    engine.AddRequest($(this).attr("href"), {}, {}, LeroyMerlin_GetArticles, obj);
	      return false;
	    }
    });
  }
}


/*function LeroyMerlin_Pagination(html, obj) {
  var $ = cheerio.load(html);
  var pagination = $("ul.pagination > li:not(.active) > a");

  LeroyMerlin_GetArticles(html, obj);
}*/


function LeroyMerlin_Contacts(html, obj) {
    var $ = cheerio.load(html);

    //<div class="colonne last"><div class="subBlock"><h2> … </h2><ul><li class="tel"> … </li><li class="tel"> … </li><li class="tel"><em> … </em><span> … </span></li><li class="tel"> … </li><li class="tel"> … </li></ul></div>

    var infoPratique = $("div#infosPratiquesIntro > div.texteInfosPratiques > div.colonne");
    var telephones = $("div.colonne.last > div.subBlock > ul > li:nth-child(1) > span").text();
    //var tab = text.replace(/\s*\n\s*/g, "\n").split("\n");
    var contact = {};
    contact.addr = [];
    contact.tel = prettify_me($("div.colonne.last > div.subBlock > ul > li:nth-child(1) > span").text());
    contact.fax = prettify_me($("div.colonne.last > div.subBlock > ul > li:nth-child(2) > span").text());
    contact.enseigne = name;
    contact.idMag = obj.MagasinId;

    contact.addr.push(prettify_me(infoPratique.find("div.colonne > div:nth-child(5) > p:nth-child(3)").text()));


    /*
    for (var i = tab.length - 2; i > 1; i--) {
	if (/Tél\. : /.test(tab[i]))
	    contact.tel = /: (.*)$/.exec(tab[i])[1];
	else if (contact.tel && !(/^BP/.test(tab[i])))
	    contact.addr.splice(0, 0, tab[i]);
    }*/
    require("./Contact.js").ExportProducts(contact);
}


function LeroyMerlin_Niv3(html, obj){
    var $ = cheerio.load(html);
    obj = engine.clone(obj);
    obj.attach_client = true;

    var len = $("ul#familys > li > a").each(function() {
	  var href = $(this).attr("href");
    console.log(newObj.tree, href);

    if (href){
      newObj = engine.clone(obj);
	    newObj.tree.push($(this).text().trim());
	    //console.warn(newObj.tree);
	    //process.exit(0);
      //engine.AddRequest(href, {} ,{}, LeroyMerlin_Pagination, newObj);
      //if ($(this).text().trim()==='Ossature métallique pour cloison et plafond'){
      if ($(this).text().trim()==='Cuisine Delinia')
        //engine.AddRequest(href, {} ,{}, LeroyMerlin_Pagination, newObj);
        engine.AddRequest(href, {} ,{}, LeroyMerlin_GetArticles, newObj);
      else
        engine.AddRequest(href + "?resultListShape=PLAIN", {} ,{}, LeroyMerlin_GetArticles, newObj);
        //engine.AddRequest(href + "?resultListShape=PLAIN", {} ,{}, LeroyMerlin_Pagination, newObj);
      //}
	}
    }).length;

    if (len === 0){
      engine.AddRequest(obj.lasturl, {} ,{}, LeroyMerlin_GetArticles, obj);
    	//LeroyMerlin_Pagination(html, obj);
    }
}

function getHrefFromSpan (className) {
    var base = "0A12B34C56D78E9F";
    var hash, href = "";
    var c1, c2, i = 0;
	if (className){
		var hashbeg = className.indexOf(" ");
		var hashend = className.indexOf(" ", hashbeg + 1);
		if (hashend == -1)
			hashend = className.length;

		if (hashbeg > 0) {
			hash = className.substr(hashbeg + 1, hashend - hashbeg - 1);
			for (i = 0; i < hash.length; i += 2) {
				c1 = base.indexOf(hash.charAt(i));
				c2 = base.indexOf(hash.charAt(i + 1));
				href += String.fromCharCode((c1 * 16) + c2);
			}
		}
		return (href);
	}
}

function LeroyMerlin_Navigation(html, obj){
  //engine.AddRequest('http://www.leroymerlin.fr/v3/p/produits/carrelage-parquet-sol-souple/carrelage-sol-et-mur/joint-carrelage-et-mosaique-l1308222766?resultOffset=0&resultLimit=100&resultListShape=PLAIN&priceStyle=SALEUNIT_PRICE', {}, {}, LeroyMerlin_GetArticles, obj);
  //engine.AddRequest('/v3/p/produits/cuisine/meuble-de-cuisine/cuisine-delinia-l1401014932', {}, {}, LeroyMerlin_GetArticles, obj);
  //engine.AddRequest('http://www.leroymerlin.fr/v3/p/produits/carrelage-parquet-sol-souple/parquet-stratifie-et-plancher/parquet-contrecolle-et-massif-l1308217050?pageTemplate=Famille%2FCarrelage%2C+parquet+et+sol+souple&resultOffset=48&resultLimit=50&resultListShape=PLAIN&nomenclatureId=17321&priceStyle=CAPACITYUNIT_PRICE', {}, {}, LeroyMerlin_GetArticles, obj);
  //engine.AddRequest('http://www.leroymerlin.fr/v3/p/produits/cuisine/poubelle-tabouret-et-accessoires-de-cuisine/tabouret-de-cuisine-l1308218105', {}, {}, LeroyMerlin_GetArticles, obj);
  //engine.AddRequest('http://www.leroymerlin.fr/v3/p/produits/terrasse-jardin/terrasse-et-sol-exterieur/dalle-et-pave-exterieur-beton-pierre-naturelle-pierre-reconstituee/dallage-en-pierre-naturelle-l1308217872?pageTemplate=Famille%2FTerrasse+et+jardin&resultOffset=0&resultLimit=50&resultListShape=PLAIN&nomenclatureId=19614&priceStyle=SALEUNIT_PRICE', {}, {}, LeroyMerlin_GetArticles, obj);
  //return;

    var $ = cheerio.load(html);
    var _obj = engine.clone(obj);

    //if (obj.retrieveContacts){
    //engine.AddRequest($("div.infosPratiquesMag > p.link > a").attr("href"), {}, {}, LeroyMerlin_Contacts, _obj);
    //return;
     /*                  Coordonnes des magasins                                    */
     if (process.argv[3] && (process.argv[3].toLowerCase() == 'contact' )){
       if(_obj.MagasinId != 0){
         var contactMag = []
         contactMag.push(_obj.Magasin)
         contactMag.push(_obj.MagasinId)
         var adresse = $(" #context .infosPratiquesMag .subBlock ").eq(1)
         var codePostal = htmlToText.fromString(adresse.find('p').first().html(), { wordwrap: false })
         codePostal = codePostal.substring(codePostal.lastIndexOf("\n") + 1).trim()
         codePostal = codePostal.substring(0,5).trim()
         adresse = htmlToText.fromString(adresse.find('p').first().html(), { wordwrap: false }).replace(/\n/g," ");//adresse.find('p').first().text().trim()
         contactMag.push(adresse)
         contactMag.push(codePostal)
         var coordonnees = $(".layerProduitContent .textPlanItineraire .subBlock p").last().text().trim()
         var latitude = coordonnees.split(',')[0].trim()
         var longitude = coordonnees.split(',')[1].trim()
         contactMag.push(latitude)
         contactMag.push(longitude)
         logger.logAttrVal('Coordonnées ===>', contactMag)
         contact.output(contactMag.join(';'))
       }
     }else{

	$("div#contentNav > ul > li").each(function(i0) {
    	    //var n1 = $(this).find("span.nav-entry").text().trim();
			var n1 = $(this).find("h2 a.clicCT").text().trim();
			n1 = n1.substring(13, n1.length);
	    $(this).find("ul.sousColonne > li").each(function(i1) {
	    	var n2 = $(this).text().trim();
		if ($(this).find("a").attr("href")){
		    var href2 = $(this).find("a").attr("href"); //getHrefFromSpan($(this).children("span").attr("class"));
		    newObj = engine.clone(_obj);
		    newObj.tree.push(n1);
		    if (href2) {
			newObj.tree.push(n2);
      //console.log(n1, n2, href2);
      //if (n1==='Cuisine' && n2 ==='Meuble de cuisine')
      //if (n1==='Matériaux & Menuiserie' && n2 ==='Cloison et plafond')
      	engine.AddRequest(href2 + "?resultListShape=PLAIN", {} ,{}, LeroyMerlin_Niv3, newObj);
		    }
		}
	    });
	});
}
//process.exit(0);
}

function LeroyMerlin_SansMagasin(obj){
  ReqObject = engine.clone(obj);
  ReqObject.tree = [];
  ReqObject.Magasin = 'Centrale Leroy Merlin';
  ReqObject.MagasinId = 0;

    engine.BindRequest("/", {}, {}, LeroyMerlin_GetDetailArticles, ReqObject);

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

  ObjMag8.link = "https://www.leroymerlin.fr/v3/p/magasins/grenoble-2-l1500668713"
  ObjMag8.storeId = 194
  ObjMag8.name = 'Grenoble (Saint-Egrève)'

  ObjMag9.link = "https://www.leroymerlin.fr/v3/p/magasins-l1308220543"
  ObjMag9.storeId = 193
  ObjMag9.name = 'Brest (Guipavas)'

  SuppArray.push(ObjMag1,ObjMag2,ObjMag3,ObjMag4,ObjMag5,ObjMag6,ObjMag7)

  SuppArray.forEach( function(elm){
    ReqObject = engine.clone(obj);
    ReqObject.tree = [];
    ReqObject.Magasin = elm.name;
    ReqObject.MagasinId = elm.storeId;
    ReqObject.jar["store"] = "store=" +  elm.storeId;
    //if (elm.storeId && engine.shouldBeDone(elm.storeId)){
    if (elm.storeId == obj.MagId){
      logger.logTree(elm.link,elm.storeId,elm.name)
      engine.BindRequest(ReqObject.lookup, {}, {}, LeroyMerlin_GetDetailArticles, ReqObject);
      //engine.BindRequest(elm.link, {}, {}, LeroyMerlin_Navigation, ReqObject);
    }

  })
}


function LeroyMerlin_MagasinList2(html, obj){
  var $ = cheerio.load(html);

  obj = engine.clone(obj);
  //obj.https = undefined; //07/02/2017 Passe en https
  //obj.public_ip = undefined;

  console.log($(".notvisible a").length);
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
        //if (MagasinId=='75'){

      if(MagasinId == ReqObject.MagId) {
  	 //if (MagasinId && engine.shouldBeDone(MagasinId) && MagasinId!='57'){ // Reims (Cormontreuil) Doublon
        logger.logTree(MagasinId,href,MagasinName)
  	    //engine.BindRequest(href, {}, {}, LeroyMerlin_Navigation, ReqObject);
        engine.BindRequest(ReqObject.lookup, {}, {}, LeroyMerlin_GetDetailArticles, ReqObject);

  	  }
    }
   	/*var MagasinId = $(this).attr('data-storeid');
  	//console.log("LeroyMerlin Magasin liste 2 IDMAG[" + MagasinId + "]");
	  var href =  $(this).attr('href');
	  var MagasinName = $(this).attr('title');


	  ReqObject.jar["store"] = "store=" +  MagasinId;
	  if (MagasinId && engine.shouldBeDone(MagasinId)){
	    engine.BindRequest(href, {}, {}, LeroyMerlin_Navigation, ReqObject);
	  }*/
  });
  // On traite le magasin central


//  LeroyMerlin_SansMagasin(obj);
  LeroyMerlin_SuppMagasin(obj)
}

function LeroyMerlin_MagasinList(html, obj){
  var $ = cheerio.load(html);
  //var hrefListMag = $("li.trouverMag > h3 > a").attr("href");
  var hrefListMag = "/v3/p/magasins-l1308220543";

  //clonnage de l'objet request
  ReqObject = engine.clone(obj);
  ReqObject.tree = [];

  //ReqObject.https = true; //07/02/2017
  //ReqObject.public_ip = true;
	console.log("\n\n ICI LeroyMerlin_MagasinList \n\n");


  engine.BindRequest(hrefListMag, {}, {}, LeroyMerlin_MagasinList2, ReqObject);
}





function update(param){
    var obj = {};

    //engine.init(param.ttw, param.tor);
    //engine.setProxyList(param.proxy_list);
    //engine.setParallelRequest(param.parr_req);
    obj.hostname = "www.leroymerlin.fr";
    obj.Enseigne = name;
    obj.TestPrix = 0
    obj.https = true; //07/02/2017 Passe en https
    obj.public_ip = true;
    //obj.filter = param.filter
    //obj.filename = param.filename;
    //Magasin Internet (Pas de connexion sur un magasin en particulier)
    //engine.BindRequest("/", {}, {}, LeroyMerlin_SansMagasin, obj);
    //Magasin Internet (Connexion sur un magasin en particulier)
    logger.logAttrVal('PID',  obj.Enseigne +' / ' +process.pid)
  //  logger.stopLog()
    engine.BindRequest("/", {}, {}, LeroyMerlin_MagasinList, obj);
    //engine.BindRequest("/", {}, {}, LeroyMerlin_SansMagasin, obj)

}

function debug(param){
    var obj = {};

    //engine.init(param.ttw, param.tor);
    //engine.setProxyList(param.proxy_list);
    //engine.setParallelRequest(param.parr_req);
    obj.hostname = "www.leroymerlin.fr";
    obj.Enseigne = name;
    obj.TestPrix = 0
    obj.https = true; //07/02/2017 Passe en https
    obj.public_ip = true;
    //obj.filter = param.filter
    //obj.filename = param.filename;
    //Magasin Internet (Pas de connexion sur un magasin en particulier)
    //engine.BindRequest("/", {}, {}, LeroyMerlin_SansMagasin, obj);
    //Magasin Internet (Connexion sur un magasin en particulier)
    logger.logAttrVal('PID',  obj.Enseigne +' / ' +process.pid)
  //  logger.stopLog()
    obj.filename = param.filename;
    obj.MagId = '140'; // dont set obj.MagasinId at this level
    //obj.lookup = 'http://www.leroymerlin.fr/v3/p/produits/meuble-vasque-l-60-x-h-64-x-p-48-cm-blanc-neo-line-e1500541607';
    //obj.lookup = 'http://www.leroymerlin.fr/v3/p/produits/tuile-monier-silvacane-littoral-canal-midi-e46462';
    obj.lookup = 'http://www.leroymerlin.fr/v3/p/produits/verriere-atelier-aluminium-noir-vitrage-non-fourni-h-1-08-x-l-1-23-m-e1401576645';
    //obj.lookup = 'http://www.leroymerlin.fr/v3/p/produits/coupe-bordure-hybride-ryobi-one-rlt1831h25-e1500554998';
    obj.requestID = 0;
    engine.BindRequest("/", {}, {}, LeroyMerlin_MagasinList, obj);
    //engine.BindRequest("/", {}, {}, LeroyMerlin_SansMagasin, obj)

}


module.exports = {
    update : update,
    debug : debug
};
