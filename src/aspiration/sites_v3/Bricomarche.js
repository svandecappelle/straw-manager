//
// Bricomarche.js for OptiMix
// CHELBI Ahmed
//

var cheerio = require('cheerio');
var dateFormat = require('dateformat');
var outils = require("../engine/outils");
var name = "Bricomarche";
var htmlToText = require('html-to-text');
var xlblogger = require('xlblogger');
var logger = new xlblogger("Bricomarche");


function getDataArticle(html, obj){
  var $ = cheerio.load(html);
  newObj = engine.clone(obj);

  logger.logValColor('*********Fiche**************')
  // manage fail
  var desc_html = $('.fiche-description').html()
  logger.logAttrVal('desc_html',desc_html.length.toString())

  data = {};

	if ($('span.product_avaliable.product_avaliable-online-only').text().length > 0) {
    logger.logAttrVal('Produit non disponible','Produit non disponible')
		process.send({
			requestID  :  newObj.requestID,
			error      :	"produit non disponible",
			data       :  undefined
		})

		process.exit(1); // important !!
	}


	var libelle1 = $('#h2-fiche-description').text().replace(/\n/g, "").replace(/\r/g, "").trim();
  var livraison = ($('.content-fiche-produit .onsale-product-container-inside').attr('style') &&
  $('.content-fiche-produit .onsale-product-container-inside').attr('style').indexOf('livraison_incluse') > 0)


  data.categories= obj.tree;
  data.timestamp = +(new Date());
  data.enseigne = obj['Enseigne'];
  data.magasin = obj['Magasin'];
  data.magasinId = obj['MagasinId'];
	data.libelles = [];
  data.libelles.push(libelle1);
  if (livraison){data.libelles.push("Livraison Incluse")}
  textPrix =  htmlToText.fromString($('.fiche-price .new-price').html(), { wordwrap: false }).replace(/\n/g," ");
  prixUnite = textPrix.indexOf('soit') > 0

  data.prix = textPrix;
  if (prixUnite) {
    data.prix = textPrix.split('soit')[0].trim()
    data.prixUnite = textPrix.split('soit')[1].trim()
  }
  logger.logAttrVal("unite","unite")
  data.ancienPrix =  htmlToText.fromString($('.fiche-price .old-price').html(), { wordwrap: false }).replace(/\n/g," ");


  desc_html = $('.fiche-description').html()
  data.srcImage = $('#image').attr('src')

  try {
    var id = html.split("'id': '")[1].split("',")[0].trim()
    data.idProduit = id;
  } catch (e) {
    logger.logValColor(e)
  }

  try {
    var ref = desc_html.split('<p>Ref')[1].split('</p>')[0].trim()
    data.cip7 = ref; // idxProduit => cip7
  } catch (e) {
    logger.logValColor(e)
  }


  try {
    var reference = desc_html.split('rence')[1].split('<')[0].trim()
    data.cip13 = reference; //idProduit2 => cip13
  } catch (e) {
    logger.logValColor(e)
  }
  try {
    var marque = desc_html.split('<td><strong>Marque</strong></td>')[1].split('</td>')[0].trim().split('<td>')[1]
    data.marque = marque;
  } catch (e) {
    logger.logValColor(e)
  }

  data.promo = data.ancienPrix ? 1 : 0;
  data.promoDirecte = data.promo;

  // Code EAN

  data.ean = undefined;
  var re = /([0-9]{13})/;
  var str = data.srcImage
  var m;

  if ((m = re.exec(str)) !== null) {
          data.ean = m[0]
  }


  data.dispo = ($('.product_avaliable').length > 0) ? 0 : 1;
	data.caracteristique = [];

  //console.log($('.fiche-description table tr').html());
 $('.fiche-description table tr').each(function () {
		var attribut = $(this).find('td').eq(0).text().trim()
	 	var valeur = $(this).find('td').eq(1).text().trim()
		logger.logAttrVal(attribut,valeur);
		data.caracteristique.push(attribut+" = "+valeur);
	})

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



function Bricomarche_List(html, obj) {
  var $ = cheerio.load(html);

  if ($("#product-container").length > 0) {

    logger.logValColor('recursive nomenc list')
    $(".block-product .block").each(function () {
       var cloneRec = engine.clone(obj);
        var link = $(this).find("[style='text-decoration: none']").attr('href')
        var title = $(this).find('.head h2').text().trim()
        var nbProd = $(this).find('.magento-product-count').text().trim()
        cloneRec.tree.push(title)
        logger.logTree(title+' ('+nbProd+')','=>',link)

/*                       subCategory = ($(this).find('li a').length > 0) ? true : false

                        if (subCategory) {
                        $(this).find('li a').each(function (){
                          niveauX = $(this).text().trim()
                          var href = $(this).attr('href')
                          var cloneSub = engine.clone(cloneRec);
                          lastPositionPar = $(this).text().trim().lastIndexOf('(')
                          var tempValue = $(this).text().trim().substring(0,lastPositionPar)
                          logger.logValColor(tempValue.trim()+" ===> "+href)
                          cloneSub.tree.push(tempValue.trim())

                          engine.BindRequest(href, {}, {}, Bricomarche_List, cloneSub);

                        })
                        }else {
                        logger.logTree("[####]","NO SUB LINK","[####]")
*/
  engine.BindRequest(link, {}, {}, Bricomarche_List, cloneRec);
                //      }
     })

  }else {
    // product list

      logger.logAttrVal("inside magasin",$(".store-details strong").text() + $("#choose-store-confirm h5").text())

      $("#product-block .item").each(function(){

        var prodName = $(this).find('[itemprop="name"]').text()
        var prodURL = $(this).find('.view-product-footer').attr('href')
          // go to details

        if (obj.MagasinId == 5809) {
          clone = engine.clone(obj);
          var prodName = $(this).find('[itemprop="name"]').text()
          var prodURL = $(this).find('.view-product-footer').attr('href')
          logger.logAttrVal("===> Go To Details ===> ", prodName,prodURL)
          engine.BindRequest(prodURL, {}, {}, getDataArticle, clone);
        }else { // export here
          logger.logAttrVal("===> export ===> ", prodName,prodURL)

          newObj = engine.clone(obj);
          newObj.force_url_prod = prodURL

          var libelle1 = prodName.replace(/\n/g, "").replace(/\r/g, "").trim();
          var livraison = ($('.content-fiche-produit .onsale-product-container-inside').attr('style') &&
          $('.content-fiche-produit .onsale-product-container-inside').attr('style').indexOf('livraison_incluse') > 0)

          data = {};
          data.timestamp = +(new Date());
          data.enseigne = obj['Enseigne'];
          data.magasin = obj['Magasin'];
          data.magasinId = obj['MagasinId'];
          data.libelles = [];
          data.libelles.push(libelle1);
          if (livraison){data.libelles.push("Livraison Incluse")}

          textPrix =  htmlToText.fromString($(this).find('.price .new-price').html(), { wordwrap: false }).replace(/\n/g," ");

          prixUnite = textPrix.indexOf('soit') > 0

          data.prix = textPrix;

          if (prixUnite) {
            data.prix = textPrix.split('soit')[0].trim()
            data.prixUnite = textPrix.split('soit')[1].trim()
          }
          data.ancienPrix = $(this).find('.old-price').text().trim();

          desc_html = $('.fiche-description').html()
          data.srcImage = $(this).find('.image img').attr('src')

          try {
            var id =  $(this).attr("onclick").split("','")[1].split("','")[0].trim()
            data.idProduit = id;
          } catch (e) {
            logger.logValColor(e)
          }

          // Try to get the level nomenc of filter

          logger.logValColor($(this).attr("onclick").split("','"))

          try {
            var levelX =  $(this).attr("onclick").split("','")[2].split("','")[0].trim()
            newObj.tree.push(levelX)
          } catch (e) {
            logger.logValColor(e)
          }

          data.idProduit2 = undefined;
          data.idxProduit = undefined;
          data.marque = undefined;

          data.promo = data.ancienPrix ? 1 : 0;
          data.promoDirecte = data.promo;

          // Code EAN

          data.ean = undefined;
          var re = /([0-9]{13})/;
          var str = data.srcImage
          var m;

          if ((m = re.exec(str)) !== null) {
                  data.ean = m[0]
          }


          data.dispo = ($(this).find('.price-mobile .mobile-table-hide').length > 0) ? 1 : 0;
          data.categories= newObj.tree;

          logger.logAttrVal("DATA", "BEGIN")
          console.log(data);
          logger.logAttrVal("DATA", "END")
          engine.export_products(data, newObj);

        }

      });

      nexturl = $('[title="Suivant"]').attr('href')
      if (nexturl) {
        cloneX = engine.clone(obj);
        logger.logValColor("Paginate to :"+nexturl)
        engine.BindRequest(nexturl, {}, {}, Bricomarche_List, cloneX);
      }
    }
}


function HomeMag(html, obj) {
	var $ = cheerio.load(html);
	logger.logValColor('***********[HOME '+obj.MagasinId+']***********')

	logger.logValColor("inside magasin => "+$(".store-details strong").text() + $("#choose-store-confirm h5").text())
	newObj = engine.clone(obj);
	console.log(newObj.lookup);
	engine.AddRequest(newObj.lookup, {}, {}, getDataArticle, newObj);


}

function Bricomarche_OnlyL1_Navigation(html, obj){
  var $ = cheerio.load(html);


  logger.logValColor("inside magasin => "+$(".store-details strong").text() + $("#choose-store-confirm h5").text())

  /*
  $("#magento_main-menu [role='menu'] > [data-submenu-id*='magento_submenu-']").each(function(){
    clone = engine.clone(obj);

    var n1 = $(this).find('a').eq(0).text().trim();
    var href = $(this).find('a').eq(0).attr('href');
    clone.tree = [n1];

    logger.logAttrVal(n1,href)
    //engine.BindRequest(href, {}, {}, Bricomarche_List, clone);
  });

  */

}


//Gets main categories
function Bricomarche_Navigation(html, obj){
  var $ = cheerio.load(html);

  logger.logAttrVal("inside magasin",$(".store-details strong").text() + $("#choose-store-confirm h5").text())

  $("#magento_main-menu [role='menu'] > [data-submenu-id*='magento_submenu-']").each(function(){

    var n1 = $(this).find('a').eq(0).text().trim();
    var urlLevel2 = $(this).find('a').eq(0).attr('href')
    if (n1 !== "Bonnes affaires") {
    logger.logValColor(n1)

    //$(this).find("[data-submenu-id*='magento_submenu-']").each(function(){
    $(this).find("li").each(function(){
      clone = engine.clone(obj);

	    var n2 = $(this).children('a').text().trim();
      var urlN2 = $(this).children('a').attr('href');
      classN2 = $(this).attr('class')
      classParent = $(this).parent().attr('class')

      if (classN2 == 'magento_parent') {
        logger.logAttrVal('has children',n2)

            $(this).find("li").each(function(){
              cloneX = engine.clone(obj);
              var n3 = $(this).children('a').text().trim();
              var urlN3 = $(this).children('a').attr('href');
              if ((n3.indexOf('Voir toutes les') < 0 )) {
                  logger.logAttrVal('niveau 3',n3)
                  cloneX.tree = [n1, n2, n3];
                engine.BindRequest(urlN3, {}, {}, Bricomarche_List, cloneX);
              }
            });

        }else if ((classParent == 'magento_dropdown-menu-level2') && (n2.indexOf('Voir toutes les') < 0 )) {
          logger.logTree('nav from ',n2 , urlN2)
          clone.tree = [n1, n2]
          engine.BindRequest(urlN2, {}, {}, Bricomarche_List, clone);
      }
	  });
    }
  });
}

function patch(html, obj){
  clone = engine.clone(obj);
  engine.BindRequest("http://www.bricomarche.com/nos-produits/bricolage.html", {}, {}, HomeMag, clone);


/*Single prod in list boutique en ligne */ // "http://www.bricomarche.com/nos-produits/bricolage/outillage-et-equipement-de-l-atelier/outillage-electroportatif/perceuse-sans-fil-visseuse-accessoire/autre-accessoire-de-visseuse.html"

//  urlList = "http://www.bricomarche.com/nos-produits/bonnes-affaires/soldes/soldes-deco/soldes-decoration-des-murs.html" /* Promotion list */
//  urlList = "http://www.bricomarche.com/nos-produits/bonnes-affaires/soldes/soldes-jardin-et-animalerie/potager.html?p=2" // all infos promo prix unite
//  urlList = "http://www.bricomarche.com/nos-produits/bonnes-affaires/soldes/soldes-jardin-et-animalerie/potager/serre-composteur-et-pot.html" // product indispo in list
//  urlList = 'http://www.bricomarche.com/nos-produits/amenagement/cuisine/evier.html'
//  urlList = "http://www.bricomarche.com/nos-produits/bricolage/outillage-et-equipement-de-l-atelier/outillage-electroportatif/scie-portative-accessoire.html"
//  urlList = "http://www.bricomarche.com/nos-produits/jardin.html"
//  urlList = 'http://www.bricomarche.com/nos-produits/bricolage/outillage-et-equipement-de-l-atelier/outillage-electroportatif/perceuse-sans-fil-visseuse-accessoire/autre-accessoire-de-visseuse.html'
//  urlList = "http://www.bricomarche.com/nos-produits/jardin/serre-accessoire-de-culture.html"
//  urlList = "http://www.bricomarche.com/nos-produits/animalerie/rongeur-et-petit-mammifere/alimentation-friandise.html"
//  urlList = "http://www.bricomarche.com/nos-produits/jardin/serre-accessoire-de-culture/serre.html"
  //engine.BindRequest("http://www.bricomarche.com/nos-produits/habitat-facile/adapter-sa-salle-de-bain/equipement-de-la-douche.html", {}, {}, Bricomarche_List, clone);
  //engine.BindRequest("http://www.bricomarche.com/nos-produits/chauffage/radiateur-chauffage-central.html", {}, {}, Bricomarche_List, clone);
  //engine.BindRequest("http://www.bricomarche.com/nos-produits/habitat-facile/faciliter-son-quotidien.html", {}, {}, Bricomarche_List, clone);
//  urlProd = "http://www.bricomarche.com/nos-produits/habitat-facile/adapter-sa-salle-de-bain/equipement-de-la-douche/main-courante-haute-resist-lisse-blanc-en-l-120x45cm-dlp-serie-11900.html"
//  urlProd = "http://www.bricomarche.com/nos-produits/animalerie/peche/canne/ensemble-truite-canne-telescopique-3-metres-moulinet-fr-t2-1bb.html"
//  urlProd = "http://www.bricomarche.com/nos-produits/decoration/papier-peint-et-revetement-mural/colle-decolleur/colle-pate-pret-a-l-emploi-pour-papier-peint-premium-5kg.html" // prix unité
//  urlProd = 'http://www.bricomarche.com/nos-produits/bonnes-affaires/soldes/soldes-jardin-et-animalerie/potager/tble-potagere-60-gris-anthr-ti.html' // indispo
//  urlProd = "http://www.bricomarche.com/nos-produits/jardin/serre-accessoire-de-culture/serre/base-pour-serre-venus7500-lams.html"


//  engine.BindRequest(urlProd, {}, {}, getDataArticle , clone);
//engine.BindRequest(urlList, {}, {}, Bricomarche_List , clone);
}

function runBoutiqueEnLigne(obj) {

  var url = "http://www.bricomarche.com/bma_popin/Geolocalisation/choisirMagasin"
  var clone = engine.clone(obj);
  clone.Magasin = "Boutique en ligne"
  clone.MagasinId = 0

  var options = {}
  options["method"] = "POST";
  options["addHeaders"] = {"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                           "Accept": "text/html, */*; q=0.01"};
  var post = {idPdv:0}
    if (engine.shouldBeDone(0)) {
      engine.BindRequest(url, options, post, patch, clone);
    }
}



function InitMagasin(html, obj) {
  var $ = cheerio.load(html);

    //runBoutiqueEnLigne(obj)
    $("#select_advmag option").each(function(){
      clone = engine.clone(obj);
      var urlMag = $(this).attr('value')
      clone.Magasin = $(this).text().trim()
      //clone.MagasinId = urlMag.split('/')[1]
      //A cause des MagasinId: Culoz et LES FINS qui ont plus d'un "/" dans leur value. On prendra donc la valeur qui est après la dernière occurence "/"
      clone.MagasinId = urlMag.substring(urlMag.lastIndexOf("/") + 1).trim()
      //logger.logTree(clone.Magasin, clone.MagasinId, urlMag)
      //if (clone.MagasinId  && engine.shouldBeDone(clone.MagasinId)) {
      if(clone.MagasinId == obj.MagId) {
        logger.logTree(clone.Magasin, clone.MagasinId, urlMag)
        engine.BindRequest("http://magasins.bricomarche.com/minisite/points-de-vente/magasin-bricolage/"+urlMag.trim(), {}, {}, patch, clone);
      }
    });
}

function update(param){
    var obj = {};
    obj.hostname = "www.bricomarche.com";
    obj.Enseigne = name;
    obj.tree = [];
    logger.logAttrVal('PID',  obj.Enseigne +' / ' +process.pid)
    //logger.stopLog()
    engine.BindRequest("http://magasins.bricomarche.com/", {}, {}, InitMagasin, obj);
}

function debug(param){
    var obj = {};
    obj.hostname = "www.bricomarche.com";
    obj.Enseigne = name;
    obj.tree = [];
    obj.filename = param.filename;
  	obj.MagId = '7381'; // dont set obj.MagasinId at this level
  	//obj.lookup = 'http://www.bricomarche.com/p/s/etabli-en-bois-professionnel-2m-outilfrance-865.html';
  	obj.lookup = 'http://www.bricomarche.com/p/s/perceuse-sans-fil-14-4v-mckenzie-4857.html';
  	obj.requestID = 0;

  	//engine.BindRequest("https://www.bricoman.fr/nos-magasins.html", {}, {}, Bricoman_MagasinList, obj);

    logger.logAttrVal('PID',  obj.Enseigne +' / ' +process.pid)
    //logger.stopLog()
    engine.BindRequest("http://magasins.bricomarche.com/", {}, {}, InitMagasin, obj);
}



module.exports = {
    update : update,
    debug  : debug
};
