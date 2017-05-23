var cheerio = require('cheerio');
var dateFormat = require('dateformat');
var fs = require("fs");

var name = "LMzeroCheck";
var urlparse = require("url");

var xlblogger = require('xlblogger');
var logger = new xlblogger("LMzeroCheck");
logger.startLog();



function LM_RESULT_REQUEST(html, obj) {

	var $ = cheerio.load(html);

	if ($(".first").length > 0)
	logger.logAttrVal(obj.id," IN");
	else
	logger.logAttrVal(obj.id," OUT");
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
		ReqObject.MagasinId = "1";
		engine.BindRequest(link, {}, {}, LM_RESULT_REQUEST, ReqObject);
	}
}



function LM_Patch(html, obj) {

		ReqObject = engine.clone(obj);
		ReqObject.tree = [];
		ReqObject.Magasin = name;
		ReqObject.MagasinId = "1";
		engine.BindRequest('/', {}, {}, LM_Prepare_Request, ReqObject);

}

function update(param) {
	var obj = {};

	obj.hostname = "www.leroymerlin.fr";
	obj.Enseigne = name;
	obj.filter = param.filter;
	obj.filename = param.filename;
	engine.BindRequest("/", {}, {}, LM_Patch, obj);
}

module.exports = {
	update: update
};
