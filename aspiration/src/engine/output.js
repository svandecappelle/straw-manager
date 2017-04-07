var dateFormat = require('dateformat');
var RequestClass = require("./request.js");
var fs = require("fs");
var outils = require("./outils");
var parseUrl = outils.parseUrl;

function Output(name, config) {

	this.enseigne = name;
	this.config = config;
	this.cache = {};


	if (!this.config.writeCSV) {
		console.log("export to csv ? ",this.config.writeCSV);
		return;
	}





	/* creation des dossiers */
	this.dir_aspiration = "sortie/" + this.enseigne + '-' +
		(new Date().toString()).split(" ").splice(0, 5).join("-").replace(/:/g, '-') + "/"
	fs.mkdirSync(this.dir_aspiration);
	fs.mkdirSync(this.dir_aspiration + "csvEnCours");
	fs.mkdirSync(this.dir_aspiration + "htmlTree");
	fs.mkdirSync(this.dir_aspiration + "request");
	fs.mkdirSync(this.dir_aspiration + "request/pending");

	if (process.platform == "linux") {
		try {
			fs.mkdirSync("/home/snow/out_aspiration_2")
		} catch (err) {};
		try {
			fs.mkdirSync("/home/snow/out_aspiration_2/" + this.config.out_dir_semaine)
		} catch (err) {};
		this.out_repertoire = "/home/snow/out_aspiration_2/" + this.config.out_dir_semaine + "/" + name;
		try {
			fs.mkdirSync(this.out_repertoire)
		} catch (err) {};
	} else {
		try {
			fs.mkdirSync("D:/out_aspiration_2")
		} catch (err) {};
		try {
			fs.mkdirSync("D:/out_aspiration_2/" + this.config.out_dir_semaine)
		} catch (err) {};
		this.out_repertoire = "D://out_aspiration_2/" + this.config.out_dir_semaine + "/" + name;
		try {
			fs.mkdirSync(this.out_repertoire)
		} catch (err) {};
	}
}



Output.prototype.exportProducts = function(Info, param) {
	data = [];
	data.push(Info['enseigne']);
	data.push(Info['magasin']);
	data.push(Info['magasinId']);
	for (var i = 0; i < 5; i++) {
		if (i < Info['categories'].length)
			data.push(Info['categories'][i].toString().replace(/\([0-9]\)+/g, '').trim())
		else
			data.push("");

		if (Info['categoriesId'] && i < Info['categoriesId'].length)
			data.push(Info['categoriesId'][i].toString().replace(/\([0-9]\)+/g, '').trim())
		else
			data.push("");
	}
	var promo = Info["promo"];
	data.push(promo != undefined && (promo == '1' || promo == "true" || promo == 1) ? "1" : "0")
	data.push(Info["ancienPrix"])
	data.push(Info["promoDirecte"])
	data.push(Info["promoDiff"])
	data.push(Info["marque"])
	data.push(Info['ean'])
	data.push(Info["idxProduit"])

	var dispo = Info['dispo'] ? Info['dispo'].toString() : "0";
	data.push(dispo != undefined && (dispo == '1' || dispo == "true" || dispo == 1) ? "1" : "0");

	data.push(Info["idProduit"])
	data.push(Info["idProduit2"])
	for (var i = 0; i < 5; i++) {
		if (i < Info['libelles'].length)
			data.push(Info['libelles'][i])
		else
			data.push("")
	}
	ret = parseUrl(Info['srcImage'] || "")
	if (ret.host) {
    var protocole = param.https ? "https://":"http://"
		data.push( protocole + ret.host + ret.url)
	} else {
		if (ret.protocole)
			data.push(param.hostname + ret.url)
		else{
      var protocole = param.https ? "https://":"http://"
    	data.push(protocole + param.hostname + ret.url)
    }
	}

	data.push(Info['prix'])
	data.push(Info['isPremierPrix']);
	data.push(Info['prixUnite'])
	data.push(Info['conditionnement'])
	data.push(Info['origine'])
	data.push(Info['categorie'])
	data.push(Info['calibre'])
	data.push(Info['variete'])
	data.push(dateFormat("yyyymmdd"))
	data.push(dateFormat("HHMMss"))

	for (i = 0; i < data.length; i++) {
		if (data[i] != undefined) {
			if (typeof data[i] != "String") {
				data[i] = data[i].toString();
			}
			data[i] = data[i].replace(/&amp;/g, '&').replace(/&euro;/g, 'euros').replace(/;/g, '').replace(/"/g, '\'').replace(/\n/g, ' ').replace(/\r/g, ' ').trim()
		}
	}

	/* url */
	ret = parseUrl(param.force_url_prod || param.lasturl || "");
	if (ret.host) {
		var protocole = param.https ? "https://":"http://"
		data.push( protocole + ret.host + ret.url)
	} else {
		if (ret.protocole)
			data.push(param.hostname + ret.url)
		else{
			var protocole = param.https ? "https://":"http://"
			data.push(protocole + param.hostname + ret.url)
		}
	}

  // Spécifique Para-Pharmacie
  data.push(Info['cip7']);
	data.push(Info['cip13']);

	out = data.join(";");

	if (this.config.writeCSV) {

		fs.appendFileSync(this.dir_aspiration + "csvEnCours/" + param.MagasinId + '-' + this.enseigne + '-data.csv', out + "\n");

		//console.log(this.dir_aspiration);
		//process.exit(0);
	}
	// Si informations de caractéristique, on écrit dans ce fichier
	if (Info['caracteristique'] && Info['caracteristique'].length > 0) {
		data2 = [];
		data2.push(Info['enseigne']);
		data2.push(Info['magasin']);
		data2.push(Info['magasinId']);
		data2.push(Info["idProduit"])
		for (var i = 0; i < Info['caracteristique'].length; i++) {
			data2.push(Info['caracteristique'][i]);
		}
		out = data2.join(";");
		fs.appendFileSync(this.dir_aspiration + "csvEnCours/" + param.MagasinId + '-' + this.enseigne + '-carac.csv', out + "\n");
	}
}


Output.prototype.exportToys = function(Info, param) {
	data = [];
	data.push(Info['enseigne']);
	data.push(Info['magasin']);
	data.push(Info['magasinId']);
	for (var i = 0; i < 5; i++) {
		if (i < Info['categories'].length)
			data.push(Info['categories'][i].toString().replace(/\([0-9]\)+/g, '').trim())
		else
			data.push("");

		if (Info['categoriesId'] && i < Info['categoriesId'].length)
			data.push(Info['categoriesId'][i].toString().replace(/\([0-9]\)+/g, '').trim())
		else
			data.push("");
	}
	var promo = Info["promo"];
	data.push(promo != undefined && (promo == '1' || promo == "true" || promo == 1) ? "1" : "0")
	data.push(Info["ancienPrix"])
	data.push(Info["promoDirecte"])
	data.push(Info["promoDiff"])
	data.push(Info["marque"])
	data.push(Info['ean'])
	data.push(Info["idxProduit"])

	var dispo = Info['dispo'] ? Info['dispo'].toString() : "0";
	data.push(dispo != undefined && (dispo == '1' || dispo == "true" || dispo == 1) ? "1" : "0");

	data.push(Info["idProduit"])
	data.push(Info["idProduit2"])
	for (var i = 0; i < 5; i++) {
		if (i < Info['libelles'].length)
			data.push(Info['libelles'][i])
		else
			data.push("")
	}
	ret = parseUrl(Info['srcImage'] || "")
	if (ret.host) {
    var protocole = param.https ? "https://":"http://"
		data.push( protocole + ret.host + ret.url)
	} else {
		if (ret.protocole)
			data.push(param.hostname + ret.url)
		else{
      var protocole = param.https ? "https://":"http://"
    	data.push(protocole + param.hostname + ret.url)
    }
	}

	data.push(Info['prix'])
	data.push(Info['isPremierPrix']);
	data.push(Info['prixUnite'])
	data.push(Info['conditionnement'])
	data.push(Info['origine'])
	data.push(Info['categorie'])
	data.push(Info['calibre'])
	data.push(Info['variete'])
	data.push(dateFormat("yyyymmdd"))
	data.push(dateFormat("HHMMss"))

	for (i = 0; i < data.length; i++) {
		if (data[i] != undefined) {
			if (typeof data[i] != "String") {
				data[i] = data[i].toString();
			}
			data[i] = data[i].replace(/&amp;/g, '&').replace(/&euro;/g, 'euros').replace(/;/g, '').replace(/"/g, '\'').replace(/\n/g, ' ').replace(/\r/g, ' ').trim()
		}
	}

	/* url */
	ret = parseUrl(param.force_url_prod || param.lasturl || "");
	if (ret.host) {
    var protocole = param.https ? "https://":"http://"
		data.push( protocole + ret.host + ret.url)
	} else {
		if (ret.protocole)
			data.push(param.hostname + ret.url)
		else{
      var protocole = param.https ? "https://":"http://"
    	data.push(protocole + param.hostname + ret.url)
    }
	}

	data.push(Info['articleRef']);
	data.push(Info['idFabricant']);
	data.push(Info['sku']);

	out = data.join(";");

	if (this.config.writeCSV) {

		fs.appendFileSync(this.dir_aspiration + "csvEnCours/" + param.MagasinId + '-' + this.enseigne + '-data.csv', out + "\n");

		//console.log(this.dir_aspiration);
		//process.exit(0);
	}
	// Si informations de caractéristique, on écrit dans ce fichier
	if (Info['caracteristique'] && Info['caracteristique'].length > 0) {
		data2 = [];
		data2.push(Info['enseigne']);
		data2.push(Info['magasin']);
		data2.push(Info['magasinId']);
		data2.push(Info["idProduit"])
		for (var i = 0; i < Info['caracteristique'].length; i++) {
			data2.push(Info['caracteristique'][i]);
		}
		out = data2.join(";");
		fs.appendFileSync(this.dir_aspiration + "csvEnCours/" + param.MagasinId + '-' + this.enseigne + '-carac.csv', out + "\n");
	}
}







Output.prototype.exportCarburant = function(Info, param) {

	data = [];
	data.push(param.Enseigne);
	if (param.Enseigne == 'Carburant')
		data.push(Info['idProduit'])
	else
		data.push(Info['magasinId'])

	data.push(Info['Magasin']);
	data.push(Info['carburant']);
	data.push(Info['marque']);
	data.push(Info['prix']);
	data.push(Info['prixAuLitre']);
	data.push(Info['nbLitre']);
	data.push(dateFormat("yyyymmdd"))
	data.push(dateFormat("HHMMss"))
	data.push(Info['commune']);
	if (param.Enseigne == 'Carburant')
		data.push(Info['magasinId'].split('-')[1])
	else
		data.push(Info['idProduit'])

	data.push(Info['autoroute']);
	data.push(Info['service'].join(','));
	data.push(Info['addr'].join(' '));
	data.push(Info['codePostal']);
	data.push(Info['dispo']);
	data.push(Info['latitude']);
	data.push(Info['longitude']);

	out = data.join(";");

	if (this.config.writeCSV) {
		fs.appendFileSync(this.dir_aspiration + "csvEnCours/" + param.MagasinId + '-' + this.enseigne + '-data.csv', out + "\n");
		console.log(this.dir_aspiration);
		//process.exit(0);
	}
}


Output.prototype.exportLocation = function(Info, param) {

	data = [];
	data.push(param.Enseigne);
	data.push(param.idAgence);
	data.push(param.nomAgence);
	data.push(Info['ville']);
	data.push(Info['codePostal']);
	data.push(Info['categorie']);
	data.push(Info['typeVehicule']);
	data.push(Info['marque']);
	data.push(Info['modele']);
	data.push(Info['nbKm']);
	data.push(Info['nbJour']);
	data.push(Info['dateDebut']);
	data.push(Info['dateFin']);
	data.push(Info['periode']);
	data.push(Info['dateReleve']);
	data.push(Info['prix']);
	data.push(Info['carburant']);
	data.push(Info['chargeUtile']);
	data.push(Info['dimensions']);
	data.push(Info['equipements']);
	data.push(Info['nbPlaces']);
	data.push(Info['ageMin']);
	data.push(Info['prixKmSupp']);

	out = data.join(";");

	if (this.config.writeCSV) {
		fs.appendFileSync(this.dir_aspiration + "csvEnCours/" + param.MagasinId + '-' + this.enseigne + '-data.csv', out + "\n");
		console.log(this.dir_aspiration);
		//process.exit(0);
	}
}



Output.prototype.validateCsv = function(magasinId) {
		/*
			fs.appendFileSync(this.dir_aspiration + "mag_done", magasinId + "\n");
		 }catch(err){

		 }
		*/
		try {
			fs.appendFileSync(this.dir_aspiration + "mag_done", magasinId + "\n");
			fs.renameSync(this.dir_aspiration + "csvEnCours/" + magasinId + '-' + this.enseigne + '-data.csv',
				this.out_repertoire + "/" + magasinId + '-' + this.enseigne + '-data.csv')
		}
		//}
		catch (err) {
			console.log("je ne peux pas deplacer le csv du magasin: " + magasinId)
		}

		try {
			fs.renameSync(this.dir_aspiration + "csvEnCours/" + magasinId + '-' + this.enseigne + '-carac.csv',
				this.out_repertoire + "/" + magasinId + '-' + this.enseigne + '-carac.csv');
		} catch (err) {
			// Rien a faire car le fichier n'est pas toujours la
		}


	}
	// i agree this line is stupid
Output.prototype.validate_csv = Output.prototype.validateCsv;



Output.prototype.logGlobal = function(str) {
	console.log(str);
};
Output.prototype.LogRegiment = function(i, str) {
	console.log(str);
};


Output.prototype.writeRequest = function(xml, filename) {
	var path = this.dir_aspiration + "request/pending/";
	//fs.appendFileSync(path + filename + ".req", xml);
	this.cache[(path + filename + ".req")] = xml;

}

Output.prototype.getRequest = function(filename) {
	if (typeof filename != "string")
		return filename;
	var path = this.dir_aspiration + "request/pending/";
	var f = path + filename + ".req";

	// console.log(filename);
	// console.log(f);
	// var d =  fs.readFileSync(f).toString();
	// if (filename != "home")
	// 	fs.unlink(f);

	var d = this.cache[f]
	if (filename != "home")
		delete this.cache[f];


	var parseString = require('xml2js').parseString;
	var req = null;
	parseString(d, function(err, result) {
		console.log(result);
		var obj = {};
		obj.url = JSON.parse(result.request.url[0]);
		obj.opt = JSON.parse(result.request.opt[0]);
		obj.post = JSON.parse(result.request.post[0]);
		obj.param = JSON.parse(result.request.param[0]);

		req = new RequestClass(obj.url, obj.opt, obj.post, obj.param);
	});
	return req;
}

module.exports = {
	create: function(name, config) {
		return new Output(name, config)
	}
}
