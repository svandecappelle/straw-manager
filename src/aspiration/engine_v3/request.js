var printf = require("sprintf-js")
var fs = require("fs");
var latinize = require('latenize');
var cheerio = require('cheerio');
var xmldoc = require("xmldoc");
var timers = require('timers');
var dateFormat = require('dateformat')
var zlib = require('zlib');
var http = require("http");
var querystring = require("querystring");
var iconv = require('iconv-lite');
var request = require('request');
var Q = require("q")
var _ = require("lodash")
var logger = require("log4js").getLogger('engine/request');

var clone = require("./outils.js").clone;
var parseUrl = require("./outils.js").parseUrl;
var parseURI = require('url').parse;

//var html5Lint = require( 'html5-lint');

function Display_Request(obj) {
  logger.debug("____________BEGIN______REQUEST______________")
  logger.debug("host: " + obj.options.host + ":" + obj.options.port)
  logger.debug(obj.options.method + " " + obj.url)

  for (i in obj.options.headers) {
    logger.debug(i + ": " + obj.options.headers[i]);
  }
  if (obj.options.method == "POST") {
    logger.debug("POST:")
    logger.debug(obj.post)
  }
  logger.debug("____________END______REQUEST______________")
}

var idxReq = 0;
var Position = 0;

function Request(url, opt, post, param) {
  this.url = url;
  this.addOption = opt;
  this.post = post;
  this.param = param;
  this.retry = 0;
  this.idxReq = idxReq++;

  this.buildTime = new Date();
  this.startTime = null;
  this.endTime = null;
  this.mananger = null;

  this.hostname = param.hostname;
  this.options = {};



  this.build = function() {
    var headers = {};
    var parsed = parseUrl(this.url);
    if (parsed.host){
      this.param.hostname = parsed.host;
    }
    var proxy = this.param.proxy;
    if (!proxy || proxy.length == 0) {
      var id_regiment = this.param.id_regiment;
      var id_client = this.param.id_client;

      logger.info(id_regiment, '(' + id_client + ')' +
        "tentative d'execution d'une requetes sans proxy");

      process.exit(0);
    }
    if (proxy && proxy != "PUBLIC" && this.param.public_ip != true) {
      var host = proxy.split(":")[0];
      var port = proxy.split(":")[1];
      // var username = proxy.split(":")[2];
      // var password = proxy.split(":")[3];
      // var auth = 'Basic ' + new Buffer(username + ':' + password).toString('base64');
      // headers["Proxy-Authorization"] = auth
      this.url = "http://" + this.param.hostname + parsed.url;
    } else { //Si c'est sur notre IP
      var host = this.param.hostname;
      var port = 80;
      this.url = (this.param.https ? "https://" : "http://") + this.param.hostname + parsed.url;

    }

    if (typeof post != "string")
      this.post = "";

    var method = this.addOption.method === "POST" ? "POST" : "GET";
    if (method == "GET")
      this.post = "";

    headers["Accept-Encoding"] = 'gzip,deflate';


    var user_agent = ["Mozilla/5.0 (Windows; U; MSIE 9.0; WIndows NT 9.0; en-US))",
      "Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:25.0) Gecko/20100101 Firefox/25.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.6; rv:25.0) Gecko/20100101 Firefox/25.0",
      "Mozilla/5.0 (Windows NT 6.1; rv:6.0) Gecko/20100101 Firefox/19.0",
      "Mozilla/5.0 (Windows NT 6.2; Win64; x64; rv:16.0.1) Gecko/20121011 Firefox/21.0.1",
      "Mozilla/5.0 (Windows; U; MSIE 9.0; WIndows NT 9.0; en-US))",
      "Mozilla/5.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0; GTB7.4; InfoPath.2; SV1; .NET CLR 3.3.69573; WOW64; en-US)",
      "Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1667.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1664.3 Safari/537.36"
    ]

    var id_regiment = this.param.id_regiment;
    var id_client = this.param.id_client;
    headers["User-Agent"] = user_agent[(id_regiment + id_client) % user_agent.length];

    if (method === "POST") {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['Content-Length'] = this.post.length;
    }

    for (h in this.addOption.addHeaders)
      headers[h] = this.addOption.addHeaders[h];


    headers["Cookie"] = this.BuildCookie();

    /* if (this.param.xlb) {
    headers["Cookie"] = this.param.xlb
  } */

    //console.log('cookie =',  headers["Cookie"]);
    //console.log('jar =',this.param);
    //console.log('this.request =',this.setCookie);
    //console.log('this =',this);



    this.options.host = host;
    this.options.port = port;
    this.options.path = this.url;
    this.options.method = method;
    this.options.headers = headers;
  }

  this.request = function(manager) {
    this.manager = manager;

    var obj = this;
    var enseigne = obj.param.Enseigne;
    var id_regiment = this.param.id_regiment;
    var id_client = this.param.id_client;

    //this.engine.request_manager.regiments[id_regiment].req_count += 1;
    //var w = (obj.wait || 0) + ((obj.retry || 0)* 2000);

    //  var w = 0;
    var w = engine.config.minimum_msec_entre_req
    logger.debug("[=============================================================================================================================[ Delay ("+w+"ms) ]=================]");

    if (obj.retry > 1)
      w = 2000;
    logger.debug(id_regiment, " le client (" + id_client + ") attends " + w + "s");
    if (obj.param.latinze != false) {
      obj.options.path = latinize(obj.options.path);
    }

    timers.setTimeout(function() {
      obj.startTime = +(new Date());
      Display_Request(obj);

    /*  var j = request.jar()
      var cookie = request.cookie('smile_retailershop_id=34')
      j.setCookie(cookie, obj.options.path);
    */

      var reqObj = {
        url: obj.options.path,
        method: obj.options.method,
        proxy: obj.param.https != true ? "http://" + obj.options.host + ":" + obj.options.port : undefined,
        headers: obj.options.headers,
        followRedirect: false,
        rejectUnauthorized: obj.param.rejectUnauthorized ? obj.param.rejectUnauthorized : false ,
        timeout: 35000,
        encoding: null
        //encoding: 'utf8'
      };

      if (obj.param.xlbSetJar) {
        var j = request.jar();
        var cookie = request.cookie(obj.param.xlbSetJar);
        j.setCookie(cookie, obj.options.path);
        reqObj.jar = j
        logger.debug("##################################[ Cookie ]###########################################");
        logger.debug(cookie);
        logger.debug("##################################[ Cookie ]###########################################");
        //process.exit('1')
      }


      if (reqObj.method == "POST") {
        reqObj.body = obj.post;
      }

      request(reqObj, function(error, res, html) {
        //console.log(res.headers)
        //process.exit(0);
        if (error) {
          logger.error("receive and ", error);
          executeCallback = false;
          logger.debug(id_regiment, '(' + id_client + ')' +
            "received: " + error);
          obj.ReqError((error + "") == "Error: ETIMEDOUT" ? 1024 : 542);
        } else {
          var output = obj.options.method + " " + obj.options.path + " (" + ((new Date()) - obj.startTime) + "ms) -> " + res.statusCode;

          logger.debug(id_regiment, ' (' + id_client + ')' + output);
          var executeCallback = true;
          /*console.log("res :");
					for (i in res.headers)
					{
					    console.log(i + ": " + res.headers[i]);
					}
					//process.exit(0);*/
          obj.CookieJar(res.headers['set-cookie'])
          obj.ct = res.headers['content-type'];

          // Spécifique Bricomarché, on a une erreur 500 une fois que l'on demande la fiche produit
          if (enseigne === "Bricomarche" && res.statusCode === 500) res.statusCode = 200;

          // Spécifique Castorama, on a une erreur 302 une fois que l'on sélectionne un magasin
          if (enseigne === "Castorama" && res.statusCode === 302) res.statusCode = 200;
          //{res.statusCode = 200;console.log("dans gestion erreur 302");this.Position=1;}//process.exit(0);}

          // Spécifique delamaison,
          //if (enseigne === "delamaison" && res.statusCode === 301) res.statusCode = 200;

          if (enseigne === "Cdiscount" && res.statusCode === 500) res.statusCode = 200;


          // Spécifique AtriumSante,
          if (enseigne === "AtriumSante" && res.statusCode === 443) res.statusCode = 200; // tested with the new request



          if (Math.floor(res.statusCode / 100) == 3) {
            executeCallback = false;
            //if (enseigne == 'Castorama') executeCallback = true;
            obj.addOption.method = "GET";

            //Cas leclerc (Quand on a un 302 il faut killer le cookie)
            if (!!obj.addOption["on302"]) {
              if (obj.addOption["on302"].DeleteJar == 1)
                obj.param.jar = {};
                if (obj.addOption["on302"].KeepUrl != 1) {
                  var url = parseURI(res.headers["location"]);
                    if (!url.path)
                      url.path = "/";
                  obj.url = (url.hostname || "") +
                  (url.path[0] == '/' ? url.path : '/' + url.path)
                }
              } else {
              var url = parseURI(res.headers["location"]);
              if (!url.path)
                url.path = "/";
              obj.url = (url.hostname || "") +
                (url.path[0] == '/' ? url.path : '/' + url.path)
              }
            //On precise que la requete etait en erreur
              obj.ReqError(300);
            } else if (res.statusCode != 200) {
            executeCallback = false;
            logger.debug(id_regiment, '(' + id_client + ')' +
              "received: " + res.statusCode);
            obj.ReqError(res.statusCode);
            }
          if (executeCallback) {
            obj.DecodeResponse(html, res.headers['content-encoding']);
          }
        }
      });
    }, w);
  }

  this.AfterValidation = function(valid, html) {
    this.endTime = new Date();
    //this.engine.output.appendhtml(html, this.param);
    //console.red(valid, html, this.manager.mapTokenPromises[this.param.promiseToken]);
    if (valid == true) {
      if (html != undefined) { // && html != "") {

        var p = this.manager.mapTokenPromises[this.param.promiseToken];
        console.log(p);
        p(html, _.cloneDeep(this.param));
      }
      this.manager.CleanRequest(this);
    } else {
      logger.warn(this.param.id_regiment + "une requetes est incomplete: " + this.url);
      //console.warn(html);
      //process.exit(0);
      this.ReqError(5050);
    }
  }

  this.EndRequest = function(html) {
    var req = this;

    req.AfterValidation(true, html);
    /*
		if (req.ct.indexOf('html') != -1){
		    req.AfterValidation(true, html);
		    /*
		    html5Lint(html, function(err, results){
		    	if (err){
			    console.log("html5Lint says: " + err)
			    process.exit(0);
		    	}else{
		    	    var error = results.messages
		    	    var valid = true;
		    	    for (var i = 0; i< error.length; i++){
		    		if (error[i].message == "End of file seen when expecting text or an end tag."){
		    		    valid = false;
		    		}
		    	    }
		    	    req.AfterValidation(valid, html);
		    	}
		    });
		}
		else if(req.ct.indexOf('xml') != -1){
		    req.AfterValidation(true, html);
		    /*
		    xmlparse(html, function(err, dom) {
			req.AfterValidation(!err, html);
		    });
		}
		else if (req.ct.indexOf('json') != -1){
		    console.red("json");
		    console.log(html);
		    try{
			JSON.parse(html);
		    }catch(err){
			req.AfterValidation(false, html);
			return
		    }
		    req.AfterValidation(true, html);
		}
		else{
		    req.AfterValidation(true, html);
		}
		*/
  }

  this.ReqError = function(code) {
    this.manager.ReqError(this, code);
  }

  this.DecodeResponse = function(buffer, encoding) {
    var obj = this;
    if (buffer.length) {
      if (!encoding) {
        obj.EndRequest(buffer.toString());
      } else if (encoding.search('gzip') != -1) {
        zlib.gunzip(buffer, function(err, res) {
          if (!err) {
            if (engine.config.encoding == "ISO-8859-1")
              res = iconv.decode(res, "ISO-8859-1");
            if (engine.config.encoding == "UTF-8")
              res = iconv.decode(res, "UTF-8");
            //obj.EndRequest(res.toString() + "--zip--" + buffer.toString());
            obj.EndRequest(res.toString());
          } else {
            throw new Error("can't unzip: " + err);
          }
        });
      } else if (encoding.search('deflate') != -1) {
        zlib.inflate(buffer, function(err, res) {
          if (!err) {
            if (engine.config.encoding == "ISO-8859-1")
              res = iconv.decode(res, "ISO-8859-1");
            if (engine.config.encoding == "UTF-8")
              res = iconv.decode(res, "UTF-8");
            obj.EndRequest(res.toString());
          } else {
            throw new Error("can't inflate: " + err);
          }
        });
      } else
        throw new Error("Unknown encoding: " + encoding);
    } else {
      console.red("Resquest void !");
      //console.red(html);
      obj.EndRequest("");
      //process.exit(0);
    }
  }

  /*this.DecodeResponse2 = function(buffer, encoding, afficher)
    {
	var obj = this;
	if (buffer.length)
	{
	    if (!encoding){
		obj.EndRequest(buffer.toString());
	    }
	    else if (encoding.search('gzip') != -1)
	    {
		zlib.gunzip(buffer, function(err, res){
		    if (!err) {
			if (engine.config.encoding == "ISO-8859-1")
			    res = iconv.decode(res, "ISO-8859-1");
			if (engine.config.encoding == "UTF-8")
			    res = iconv.decode(res, "UTF-8");
			//obj.EndRequest(res.toString() + "--zip--" + buffer.toString());
      if (afficher){
      console.log('dans decode', res.toString(), res.toString().length  )
      process.exit(0);}
			obj.EndRequest(res.toString());
		    } else {
			throw new Error("can't unzip: " + err);
		    }
		});
	    }
	    else if (encoding.search('deflate') != -1)
	    {
		zlib.inflate(buffer, function(err, res){
		    if (!err) {
			if (engine.config.encoding == "ISO-8859-1")
			    res = iconv.decode(res, "ISO-8859-1");
			if (engine.config.encoding == "UTF-8")
			    res = iconv.decode(res, "UTF-8");
			obj.EndRequest(res.toString());
		    } else {
			throw new Error("can't inflate: " + err);
		    }
		});
	    }
	    else
		throw new Error("Unknown encoding: " + encoding);
	}
	else{
    console.red("Resquest void !");
    //console.red(html);
    obj.EndRequest("");
    //process.exit(0);
  }

}*/

  this.BuildCookie = function() {

    if (!this.param.jar) {
      this.param.jar = {};
    }
    //console.log('info cookie', this.param.jar, this.addOption.destroyCookie, this.param.ArreterCookie);
    if (this.addOption.destroyCookie == 1) {
      this.param.jar = {};
    }
    var cookies = [];

    for (c in this.param.jar) {
      //if (c == 's_cdao') {console.log('dans cookie');process.exit(0)}
      cookies.push(c + '=' + this.param.jar[c]);
    }
    //cookies.push('s_cdao=29');
    var cookie = cookies.join("; ")
      //console.log('dednas', cookies)
      //process.exit(0)

    return cookie
  }

  this.CookieJar = function(setCookie) {
    if (this.param.dontSaveCookie)
      return
    if (!setCookie)
      return
    if (!this.param.jar) {
      this.param.jar = {};
    } else {
      this.param.jar = clone(this.param.jar);
    }
    for (i in setCookie) {
      var cook = setCookie[i].split(';')[0]
      var unit = cook.split('=')
      if (unit.length == 2) {
        this.param.jar[unit[0]] = unit[1];
      }
    }
  }
}

module.exports = Request;
