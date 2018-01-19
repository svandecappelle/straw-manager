var Engine = require('../engine/engine'),
  async = require('async'),
  logger = require('log4js').getLogger('Amazon'),
  cheerio = require('cheerio'),
  fs = require("fs"),
  child = require('child_process'),
  needle = require('needle'),
  _ = require('underscore');

class Amazon extends Engine {

  constructor(use_proxy) {
    super();
    this.name = "Amazon";
    this.use_proxy = use_proxy;
    this.on("home", this.home);
    this.on("afterValidation", this.afterValidation);
    this.on("patch", this.patch);
    this.on("RETRY_CAPTCHA", this.RETRY_CAPTCHA);
  }

  call(params) {
    console.log("entrée dans Call")
    if (params.pages) {
      this.pages = params.pages;
    }
    logger.info("Parameters call engine", params);

    this.request({
      url: "https://www.amazon.fr",
      origin: params
    }, 'home');
  };

  home(html, req) {
    logger.debug("Home view: ", this.pages !== undefined && this.pages.length > 0);
    if (req.origin) {
      req = req.origin
    }
    this.getpages(html, req);
  };

  getpages = function (html, params) {
    this.pages = []
    console.log('entrée dans Getpages')
    this.pages.push({
      name: 'Amazon',
      id: 0
    })
    params.magasin = this.pages
    var $ = cheerio.load(html);
    if ($("title").text() == "Amazon CAPTCHA") {
      this.RETRY_CAPTCHA(html, params)
    } else {
      this.request(params);
    }
  }

  RETRY_CAPTCHA(html, obj) {
    var that = this
    console.log('[#][#][#][Auto detect] CAPTCHA [#][#][#]')
    var $ = cheerio.load(html);
    console.log('*** --- CAPTCHA DETECTE --- ***')
    setTimeout(function () {
      var newObj = _.clone(obj);
      var imgsrc = $('form img').attr('src')
      var nomFichierImageTab = imgsrc.split('/')
      var nomFichierImage = that.config.captchaPath + '/' + nomFichierImageTab[nomFichierImageTab.length - 1]
      needle.get(imgsrc, { output: nomFichierImage }, function (err, response, body) {
        if (err)
          console.log(err);
        else {
          //lancer le batch pour la reconnaissance du captcha
          console.log("Lancement de amazoncracker");
          logger.info("Lancement de amazoncracker", that.config.captchaScript, nomFichierImage.toString());
          var ls = child.spawn(that.config.captchaScript, [nomFichierImage.toString()])

          ls.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
            console.log(`exists ? :` + data.indexOf('CAPTCHA ') >= 0);

            if (data.indexOf('CAPTCHA ') >= 0) {

              console.log(' image du captcha: ', $('form img').attr('src'))
              var amzn = $('input[name=amzn]').attr('value')
              var amznr = '&amzn-r=/&'
              var urlCaptchaValidation = 'https://amazon.fr/errors/validateCaptcha?amzn=' + amzn + amznr + 'field-keywords='
              var captcha = data.toString().split('CAPTCHA')[1].trim()
              var options = {
                //  follow : 2,
                headers: {
                  'Content-Type': 'text/plain;charset=UTF-8',
                  host: 'www.amazon.fr'
                  , Referer: 'https://www.amazon.fr/errors/validateCaptcha'
                }
              };
              newObj.opts = options
              //tuer le processus
              //ls.kill()

              //supprimer le fichier image
              console.log('nomFichierImage = ' + nomFichierImage);
              console.log('URL CAPTCHA', urlCaptchaValidation + captcha);
              that.request({
                url: urlCaptchaValidation + captcha,
                opts: options,
                origin: newObj
              }, 'afterValidation');
            }
          });
        }
      });
    }, 2000);
  }

  patch(html, obj, response) {
    var that = this
    newObj = _.clone(obj)
    console.log(response.statusCode)
    console.log(response.headers)

    this.request({
      url: newObj.origin.url,
      origin: newObj.origin
    }, 'afterValidation');
  }

  afterValidation(html, obj, response) {

    console.log("[==========[afterValidation]==========]")
    console.log(response.statusCode)
    console.log(response.headers)
    console.log(response.url)
    console.log(response.headers["set-cookie"])
    console.log("[==========[###############]==========]")
    var ReqObject = _.clone(obj);
    if (response.cookies && response.cookies["x-amz-captcha-1"] && response.cookies["x-amz-captcha-1"].length > 0) {
      console.log('[VALID COOKIE]')
    }

    var options = {
      rejectUnauthorized: false,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': 1,
        'Host': 'www.amazon.fr',
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
      }

    };
    ReqObject.origin.opts = options
    console.log('Next url ====>' + ReqObject.origin.url);
    console.log('obj ====>' + ReqObject.origin);
    this.request(ReqObject.origin)
  }

  decode(html, obj) {
    var $ = cheerio.load(html);
    var obj2 = _.clone(obj);
    var capt = "";
    if ($("title").text() == "Amazon CAPTCHA") {
      capt = "captcha";
      this.RETRY_CAPTCHA(html, obj2)
    } else {
      var data = {};
      data.timestamp = new Date();
      data.enseigne = obj2['Enseigne'];
      data.magasin = this.pages[0]
      data.magasinId = 0

      // Manage Tree
      var globalTree = [];
      $("ul.a-horizontal li a").each(function (elm) {
        if ($(this).text().trim().length)
          console.log("global tree push", $(this).text().trim())
        globalTree.push($(this).text().trim());
      });
      obj2.tree = []
      for (var i = 0; i < globalTree.length; i++) {
        console.log("obj2 tree push")
        obj2.tree.push(globalTree[i]);
      }
      // End Manage Tree

      data.categories = obj2.tree;

      var libelle = $("h1#title span#productTitle").text().trim();
      console.log("LIBELLE = " + libelle)
      data.idProduit = $("form.a-content input[name='ASIN']").attr("value");

      data.prix = $("span#priceblock_ourprice").text().trim();
      if (!data.prix) data.prix = $("#priceblock_saleprice").text().trim();
      if ($(".a-lineitem").children().length > 2)
        data.ancienPrix = $(".a-lineitem tr:first-child .a-span12 .a-text-strike").text();

      data.promo = data.ancienPrix ? 1 : 0;
      data.marque = $("a#brand").text().trim();
      data.srcImage = $("img#landingImage").attr("data-a-dynamic-image");
      if (data.srcImage) {
        var pos = data.srcImage.indexOf(":[");
        if (pos != -1) data.srcImage = data.srcImage.substring(2, pos - 1);
      }
      data.libelles = []
      data.libelles.push(libelle)

      if (($("div#availability >span").text().trim().indexOf("Habituellement") >= 0) || ($("#add-to-cart-button").length === 0)) {
        data.dispo = 0;
      } else {
        data.dispo = 1;
      }
      if (!data.prix) data.prix = $(".olp-padding-right span").text().trim();
      if (!data.prix) {
        console.log('Produit non disponible ' + obj.url)
        var output = {
          requestID: obj.requestID,
          error: "Pas de prix !",
          data: undefined
        };
        return this.emit('not_found', output);
      }
      var output = {
        requestID: obj2.requestID,
        data: data,
        pages: this.pages
      };
      console.log('output =' + output)
      this.emit('product', output);
    }
  }

};


module.exports = Amazon;
