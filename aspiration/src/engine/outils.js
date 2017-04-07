var fs = require("fs");

function tools() {}


tools.clone = function clone(obj) {
	if (null == obj || "object" != typeof obj) return obj;
	if (obj instanceof Date) {
		var copy = new Date();
		copy.setTime(obj.getTime());
		return copy;
	}

	if (obj instanceof Array) {
		var copy = [];
		for (var i = 0, len = obj.length; i < len; i++) {
			copy[i] = clone(obj[i]);
		}
		return copy;
	}

	if (obj instanceof Object) {
		var copy = {};
		for (var attr in obj) {
			if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
		}
		return copy;
	}
	throw new Error("Unable to copy obj! Its type isn't supported.");
}

tools.parseUrl = function(url) {
	var ret = {};
	var match = /^(https?:\/\/)/.exec(url)
	if (match && match.length > 0) {
		ret.protocole = match[1];
		url = url.replace(match[1], "")
	}
	var match = /^(([\w-]+\.)*[\w-]+\.\w+)/.exec(url)
	if (match && match.length > 0) {
		ret.host = match[1];
		url = url.replace(match[1], "")
	}
	var match = /^(:[0-9]+)/.exec(url)
	if (match && match.length > 0) {
		ret.port = match[1];
		url = url.replace(match[1], "")
	}
	if (!ret.protocole && !ret.host && url[0] != '/')
		url = '/' + url;
	ret.url = url;
	return ret
}

tools.FileToArray = function(filename) {
	// Lecture du fichier de paramétrage
	var file = fs.readFileSync(filename).toString().replace(/\r/g, '');
	var array = file.split("\n");
	if (array[array.length - 1] == "") {
		array.splice(array.length - 1, 1);
	}
	array.sort(function() {
		return 0.5 - Math.random();
	});
	return array;
};

tools.RetourneProchainLundi = function(LaDate) {
	//var LaDate = new Date();
	LaDate.setHours(0, 0, 0, 0);
	// Recherche du lundi
	var lundi = 1;
	while (LaDate.getDay() != lundi) {
		LaDate.setDate(LaDate.getDate() + 1);
	}
	return LaDate;
};

/*tools.ExtraicheChaineEnMajuscule = function (chaine){
  // Permet d'extraire la sous chaine qui est en majuscule dans une chaine
  var masque = /\b[A-Z0-9]+\b/g;
  var resultat = "";
  chaine.replace(masque, function(){
    if (resultat == '') resultat = resultat + arguments[0]; else resultat = resultat + ' ' + arguments[0];
  });

  return resultat;
}*/

tools.replaceAll = function(find, replace, str) {
	return str.replace(new RegExp(find, 'g'), replace);
};

tools.ChaineSansAccent = function(str) {
	if (str){
	 str = this.replaceAll('é', 'e', str);
	 str = this.replaceAll('è', 'e', str);
	 str = this.replaceAll('ê', 'e', str);
	 str = this.replaceAll('ë', 'e', str);
	 str = this.replaceAll('ï', 'i', str);
	 str = this.replaceAll('î', 'i', str);
	 str = this.replaceAll('à', 'a', str);
	 str = this.replaceAll('â', 'a', str);
	 str = this.replaceAll('ö', 'o', str);
	 str = this.replaceAll('ô', 'o', str);
	 str = this.replaceAll('ù', 'u', str);
	 str = this.replaceAll('û', 'u', str);
  }
	return str;
};



tools.toFormatUB = function (object) {

	var tableUB = object.split(';')
	var result = {}
	try {
		result.UB = tableUB[0]
		result.enseigne = tableUB[1]

			if (tableUB[2] && tableUB[2].trim().length > 0 && tableUB[2].indexOf('@') == 0) {
				result.urlNomenc = tableUB[2].trim().split('@')[1]
			} else {
				try {
					result.nomenclature = tableUB[2].trim().split('>')
				} catch (e) {
					result.nomenclature = [tableUB[2]]
				}
			}

		// filter to array
			try {
				result.filtres = (tableUB[3] && tableUB[3].length > 0) ? tableUB[3].trim().split('#')  : undefined
			} catch (e) {
				result.filtres = undefined
			}

			if (tableUB[4] && tableUB[4].indexOf("Libelle") > -1) {
				result.contient = tableUB[4].split('Libelle contient')[1]
			}else if (tableUB[4]){
				result.contient = tableUB[4]
			}

			/* seperate keywords with # */
			try {
				result.contient	= result.contient.trim().split('#')
			} catch (e) {
				result.contient = (tableUB[4]) ? [tableUB[4].trim()] : undefined
			}

			/* doesnt contain this keyword(s)*/

			try {
				result.contientpas	= (tableUB[5] && tableUB[5].length > 0) ? tableUB[5].trim().split('#')  : undefined
			} catch (e) {
				result.contientpas = undefined
			}

			// Simplify test (empty strings => undefined )
			if (result.contient.length == 1 && result.contient[0].length < 1) result.contient = undefined
			if (result.contientpas.length == 1 && result.contientpas[0].length < 1) result.contientpas = undefined


	} catch (e) {
		console.log('Erreur :'+ e)
	}
	return result
}


tools.exportUB = function(Info, param) {

	data = [];
	data.push(Info["UB"])
	data.push(param.Enseigne);
	data.push(Info["idProduit"])
	data.push(Info["libelle"])

	out = data.join(";");
	return out

}



tools.prettify_me = function (string) {
	return string.split("\r").join("").split("\n").join(";").split("\t").join("").trim();
};

module.exports = tools;
