var _ = require("lodash")
var clone = _.cloneDeep
var RequestClass = require("./request.js");
var dateFormat = require('dateformat');
var crypto = require("crypto")
var Q = require("q")
var builder = require('xmlbuilder');

erreurCheckeur = 0;

function Node(){
    // les nodes sont les chemin pour aller jusque dans les magasins
    // basiquement c'est un arbe
    // chaque client en recherche d'un magasin

    this.next = [];
    this.finish = false;
    this.father = undefined;

    this.get_node = function(idx){
	return this.next[idx];
    }

    this.GetNextNodeIndex = function(nbr_childrens){
	//le client-leader de chaque regiment va demander quelle requete,
	//ils doivent tous executer, l'abre est construit dans cette fonction
	//si il n'y a pas de node enfant, on en crée autant qu'il y a de requete suivantes
	//sinon on prend le premier element qui n'est pas finit

	if (nbr_childrens == 0){
	    // la requete est une dead-end, par example une recherche par departement
	    // dans un departement vide
	    console.log("0 child")
	    return undefined;
	}
	//Il y a des fils (le hemin existe deja) dans ce cas on parcours les fils et on prend le premier.
	if (this.next.length != 0){
	    if (this.next.length != nbr_childrens){
    		console.log("un node n'a pas la taille attendu, have: " +
    			    this.next.length + " expected " + nbr_childrens)
    		return ("FLAG SUICIDE");
	    }
	    for (var i = 0; i < this.next.length; i++){
			if (this.next[i].finish == false)
			    return i;
	    }
	    console.log("le node dans lequel nous somme ne contient aucun enfant non-finit")
	    process.exit(1);
	} else {
	    //Personne n'est jamais passe par la (pas de fils connus) mais il on tous déja parsé la page
	    // creation d'autant de node que la requete a d'enfant
	    for (var i = 0; i < nbr_childrens; i++){
    		var node = new Node();
    		node.father = this;
    		this.next.push(node);
	    }
	    return (0); // le premier enfant sera fait
	}
    }

    this.SetFinishedNode = function(){
    	// cette fonction est executer quand les enfants sont arriver dans les magasins
    	// on remonte l'abre recursivemnt pour mettre les node finis
    	this.finish = true;
    	if (this.father){
    	    for (var i = 0; i < this.father.next.length; i++){
    		if (this.father.next[i].finish == false)
    		    return (0)
    	    }
    	    this.father.SetFinishedNode();
    	}
    }
}


function Client(id_regiment, id_client, proxy, home_request, manager){
    this.manager = manager;
    this.proxy = proxy;
    this.jar = {};
    this.prehome = true;
    this.node = undefined;
    this.next_url = home_request;
    this.in_progress = false;
    this.pending = undefined;
    this.next_request = [];
    this.id_regiment = id_regiment;
    this.id_client = id_client;

    this.set_node = function(node){
	   this.node = node;
    }
    this.set_jar = function(j){
	   this.jar = j;
    }
    this.get_jar = function(){
	   return this.jar;
    }
    this.get_proxy = function(){
	   return this.proxy;
    }

    this.suicide = function(){
    	this.die = true;
    	this.proxy = "";
    	this.jar = {};
    	this.prehome = true;
    	this.node = undefined;
    	this.next_url = undefined
    	this.in_progress = false;
    	this.pending = undefined;
    	this.next_request = [];
    }

    /* PRE-HOME fonction */
    this.is_ready = function(){
    	// il n'y a pas de requete en cours &&
    	return this.in_progress == false && this.next_url == undefined;
    }
    this.load_request = function(){
    	// is_ready() == true pour le regiment, se prepare pour l'execution de la requete
    	if (!this.next_url){
    	    console.log("le regiment semble pret, mais je n'ai rien a faire, exit");
    	    process.exit(1);
    	}

    	this.pending = this.next_url;
    	//console.log("bb");
    	this.next_url = undefined;
    	this.next_request = [];
    	this.in_progress = true;
    	//console.log(this.id_regiment + ">> inp " + this.id_client + ": " + this.in_progress  + "   next:" + this.next_url );
    }

    this.get_pending = function(){
    	// si le client est pret, il donne sa requete et elle sera executer
    	if (!this.pending)
    	    return undefined;
    	var req = this.pending;
    	if (typeof req === "string")
    	    var req = this.manager.engine.output.getRequest(req);
    	req.param.proxy = this.proxy;
    	this.pending = undefined;
    	return req;
    }

    this.set_next_req = function(req_iq){
    	// apres que le leader est decider quelle requete il doivent executer,
    	// la next request est set

      	this.next_url = this.next_request[req_iq];
    	if (!this.next_url){
    	    console.log("on ma demander une requetes que je n'ai pas");
    	    return "FLAG SUICIDE";
    	}
    	this.node = this.node.get_node(req_iq);
    	this.next_request = [];
    }

    this.find_next = function(){
    	// seul le leader-client execute cette requete
    	return this.node.GetNextNodeIndex(this.next_request.length);
    }
    this.push_request = function(req_token){
	   this.next_request.push(req_token);
    }
    this.reset_after_query = function(){
    	this.manager.engine.output.LogRegiment(this.id_regiment, "reset du client: " + this.id_client);
    	this.in_progress = false;
    }
}

function Regiment(manager){
    this.manager = manager;
    this.clients = [];
    this.idx_client = 0;
    this.leader_client;
    this.id_regiment = manager.regiments.length;
    this.prehome = true;
    this.pending = [];
    this.execStatus = false;
    this.reqBin = [];

    this.prod_count = 0;
    this.req_count = 0;

    // status permettant de savoir si il fait prendre les requetes de ce mag


    /* INIT */
    var id_client = 0;
    //Pour chauqe membre du regiement creation d'une flux pour la log, affectation d'un proxy
    //console.log( manager.engine.config);
    for (var i = 0; i < manager.engine.config.nb_clients_par_mag; i++){
        var proxy = this.manager.available_proxy.shift();
    	this.manager.engine.output.LogRegiment(this.id_regiment, "creation d'un client(" +id_client+ "): " + proxy);
    	if (proxy == undefined){
    	    console.log("erreur, plus assez d'ip pour la creation du Client");
    	    process.exit(1);
    	}
        var home_token = manager.home_token;
    	// TODO Steeve: use a logger
        //console.log(home_token);
        var req = manager.engine.output.getRequest(home_token);
    	// TODO Steeve: use a logger
        //console.log(req);
    	//initialisation ID regiement et ID client a la premiere requete
    	req.param.id_regiment = this.id_regiment;
    	req.param.id_client = id_client;
    	req.param.proxy = proxy;
    	var cli = new Client(this.id_regiment, id_client, proxy, req, this.manager);
    	//Le root de l'arbre de recherche de magasin est la position actuelle
    	cli.set_node(this.manager.root);
    	//Affection de ce client (membre du regiement) au regiment
    	this.clients.push(cli);
    	id_client++;
    }
    //Le client leader est designe
    this.leader_client = this.clients[0];

    /* functions */
    //Methode unitaire qui indique si tous les membres du regiment sont au même niveau de l'arbre
    this.is_complete = function(){
    	for (i in this.clients){
    	    if (this.clients[i].is_ready() == false)
    		return false;
    	    this.manager.engine.output.LogRegiment(this.id_regiment, i + " is ready");
    	}
    	this.manager.engine.output.LogRegiment(this.id_regiment, "regiment is full");
    	return true;
    };

    this.suicide = function(ctx){
	this.manager.engine.output.LogRegiment(this.id_regiment, "je me suicide");
	this.dead = true;
	//Pour tous les membres du regiement
	for (var i in this.clients){
	    //recuperation du proxy
	    //Si 403 le proxy est efface du client donc il ne le rend pas et se suicide direct
	    var p = this.clients[i].get_proxy();
	    if (p.length > 0){
		this.manager.engine.output.LogRegiment(this.id_regiment, "je rends l'ip: " + p + " au request-manager")
		this.manager.available_proxy.push(p);
	    }
	    this.clients[i].suicide();
	}
	//Reinitialisation du regiment => mis a null des variables du regiement
	this.clients = [];
	if (ctx && ctx.prehome == true){
	    this.manager.engine.output.LogRegiment(this.id_regiment, "je me sucide dans la prehome, lancement d'un nouveau regiment");
	    this.manager.LaunchNewRegiment();
	}
	if (ctx && ctx.sucess == true){
	    //Bascule le fichier de en cours a termine

    /*
          process.send({fun : "EndOfMag", param : {
    		libelle : this.Magasin,
    		idMagasin : this.MagasinId.toString(),
    		nbrReq :  this.req_count,
    		nbrProd : this.prod_count,
    		reqAbandon : this.reqBin.length
    	    }});
    */

	   // this.manager.engine.output.validate_csv(this.MagasinId); // For the API


      // on augmente le nomrbre de magasin qui ont été traités (fini)
      this.manager.nbMagTraite += 1;
	}
    }

    this.erreur_arbre = function(){
	/* BUG mail abre de recherche de mag different */
	erreurCheckeur += 1;
	if (erreurCheckeur > 10){
	    console.log("trop d'erreur expected ...");
	    process.exit(1);
	}
	this.prehome = false;
        this.suicide({prehome : true});
    }

    this.proceed = function(){
    	var id = this.leader_client.find_next();
    	this.manager.engine.output.LogRegiment(this.id_regiment, "le leader client a choisi la requete: " + id);
    	if (id == "FLAG SUICIDE")
    	    this.erreur_arbre();
    	else if (id != undefined){
    	    for (var i in this.clients){
    		if (this.clients[i].set_next_req(id) == "FLAG SUICIDE"){
    		    this.erreur_arbre();
    		    return;
    		}
    	    }
    	    this.attack();
    	} else {
    	    this.manager.engine.output.LogRegiment(this.id_regiment, "le leader client n'a pas trouver de requetes suivante, lancement suicide...");
    	    this.leader_client.node.SetFinishedNode();
    	    this.prehome = false;
    	    this.suicide({prehome : true});
    	}
    }

    this.attack = function(){
        for (i in this.clients){
            this.clients[i].load_request();
        }
    }

    this.transition_home = function(){
    	if (this.prehome == false)
    	    return;
    	for (i in this.clients){
    	    if (this.clients[i].prehome == true)
    		return;
    	}
    	// a ce state tous les clients sont arriver dans le home du magasin
    	//this.manager.engine.output.LogRegiment(this.id_regiment, "hello mag " + this.pending[0].param.MagasinId);
    	this.leader_client.node.SetFinishedNode();
    	this.prehome = false;
    	this.manager.engine.output.LogRegiment(this.id_regiment, "la transition est complete, lancement d'un nouveau regiment");
    	this.manager.LaunchNewRegiment();
    	if (this.pending.length == 0){
    	    this.manager.engine.output.LogRegiment(this.id_regiment, "la magasin n'a fournis aucune requetes, sucide");
    	    this.suicide();
    	}
    }

    this.get_next_request = function(){
	if (this.execStatus == false || this.dead == true)
	    return undefined;
	if (this.prehome == true){
	    var req;
	    var start = this.idx_client;
	    while ((req = this.clients[this.idx_client].get_pending()) == undefined){
    		this.idx_client = (this.idx_client + 1) %  this.clients.length;
    		if (start == this.idx_client)
    		    return undefined;
	    }
	    this.idx_client = (this.idx_client + 1) %  this.clients.length;
	    return req;
	} else {

	    if (this.pending.length <= 0)
		  return undefined;

	    var allDead = true;
	    for (var k in this.clients){
    		if (this.clients[k].die != true)
    		    allDead = false;
	    }
	    if (allDead){
    		this.manager.engine.output.LogRegiment(this.id_regiment, "tous les proxy sont mort, sucide du regiment");
    		this.suicide();
    		return undefined;
	    }
	    var start = this.idx_client;
	    while (this.clients[this.idx_client].die == true || this.clients[this.idx_client].in_progress == true){
    		// tant que c'est un client mort ou un client en cours , prendre le suivant, pour aller plus
    		// vite il faudrai peut etre faire plusieur requetes par client dans les mags
    		this.idx_client = (this.idx_client + 1) %  this.clients.length;
    		if (start == this.idx_client){
    		    return undefined;
    		}
	    }



	    var req = this.manager.engine.output.getRequest(this.pending.pop());
	    if (!this.MagasinId){

        /*
            process.send({fun : "StartMag", param : req.param.MagasinId});
        */

		this.MagasinId = req.param.MagasinId;
		this.Magasin = req.param.Magasin;
	    }
	    if (req.param.use_request_jar == undefined || req.param.use_request_jar != true){
	    	req.param.jar = this.clients[this.idx_client].get_jar();
	    }
	    req.param.proxy = this.clients[this.idx_client].get_proxy();
	    req.param.id_regiment = this.id_regiment;
	    req.param.id_client = this.idx_client;
	    this.clients[this.idx_client].in_progress = true;
	    this.manager.engine.output.LogRegiment(this.id_regiment, "affectation d'une requete au client: " + this.idx_client);
	    this.manager.engine.output.LogRegiment(this.id_regiment, "Va etre mis a execution: " + req.url);
	    this.idx_client = (this.idx_client + 1) %  this.clients.length;
	    return req;
	}
    }
}

function RequestManager(enseigne, config, output){
    this.root = undefined;
    this.available_proxy = [];
    //identifie un membre du regiment (incremente % nbr membre regiment, dans la fonction execute)
    this.idx_regiment = 0;
    this.in_progress = 0;
    this.regiments = [];
    this.mapTokenPromises = {};
    this.engine = {config : config, output : output};
    for (var i in this.engine.config.liste_proxy){
	    this.available_proxy.push(this.engine.config.liste_proxy[i]);
    }
    this.nbMagTraite = 0;
}

//  Creation de nouveau regiment
//  - apres la home pour acceder au magasin
//  - Apres un suicide (Sur 403 / 500 etc...)
//  - Pendant la transition
RequestManager.prototype.LaunchNewRegiment = function(){
    if (this.root.finish == true){
    	this.engine.output.logGlobal("l'arbre a ete parcourue a 100%, plus besoin de nouveau regiment")
    	return
    }

    this.engine.output.logGlobal("Un nouveau regiment est né!");
    var reg = new Regiment(this);
    this.regiments.push(reg);
    reg.attack();
}



//Ajout de requete a la pile
// - Clone de la première requete pour permettre d'acceder a un magasin depuis la /home
// - Les autres requetes sont raprochees du client par rapport aux IDClient / IdRegiment
RequestManager.prototype.AddRequest = function(param, req_token, cb, xmlbuilder){

    this.mapTokenPromises[param.promiseToken] = cb;

    if (!this.root){ // la toute premiere requete
    	this.root = new Node();
    	req_token = "home";
    	this.home_token = req_token;
    	xmlbuilder.request.param = {'#text': JSON.stringify(param)};
    	var xml = builder.create(xmlbuilder);
    	this.engine.output.writeRequest(xml, req_token);
    	//Creation du premier regiment
    	this.LaunchNewRegiment();
    } else {

    	//precise a quelle regiment la requete appartient
    	var id_regiment = param.id_regiment;
    	//precise le membre du regiment auquel la requete est affectee
    	var id_client = param.id_client;

          //this.engine.output.LogRegiment(id_regiment, " l'url vient de rentrer de le manager: " + req.url);
    	//Préhome == Entre la home et le magasin (dans les pages intermédiaire pour acceder a un magasin)
    	if (this.regiments[id_regiment].prehome == false
    	    || param.StoreInRegiment == true){
    	    //Une que par client dans le PreHome (Entre Home et Magasin)
    	    param.requete_magasin = true;
    	    // flag pour le "TestEnding" dans le but de tester la fin d'un mag
    	    this.regiments[id_regiment].pending.push(req_token);
    	} else {
    		//Pas dans la prehome
    		//On stock les requetes dans des queue differente pour chaque client
    		//Cas particiulier (Transition entre la préhome et les magasin. Dès que le premier arrive dans un mag il
    		//stock le resultat de la requete
    	    if (param.MagasinId != undefined && id_client == 0){
    	    	param.StoreInRegiment = true;
    	    }

    	    this.engine.output.LogRegiment(id_regiment, " une nouvelle requetes pour le client: " + id_client);

    	    if (this.regiments[id_regiment].dead != true)
    	    	this.regiments[id_regiment].clients[id_client].push_request(req_token);
        }
    	xmlbuilder.request.param = {'#text': JSON.stringify(param)};
        var xml = builder.create(xmlbuilder);
    	this.engine.output.writeRequest(xml, req_token);
    }

    this.Execute();
}

//Validation de la fin du magasin
RequestManager.prototype.TestMagEnd = function(id_regiment){
    var r = this.regiments[id_regiment];
    if (r.prehome == false && r.dead != true && r.pending.length == 0){
    	for (var j =0; j < r.clients.length; j++){
    	    if (r.clients[j].in_progress == true){
    	    	return;
    	    }
    	    this.engine.output.LogRegiment(id_regiment, j + " a finit!");
    	}
    	this.engine.output.LogRegiment(id_regiment, "le magasin semble finit, suicide...");
    	r.suicide({sucess : true});
    	/* super end */
    	if (this.root.finish == true && this.in_progress == 0){
    	    for (reg in this.regiments){
        		if (this.regiments[reg].dead == false)
        		    return
    	    }
    	    this.engine.output.LogRegiment(id_regiment, "l'enseigne semble finit, suicide...");
            if (this.engine.config.auto_exit === undefined || this.engine.config.auto_exit === true){
              process.exit(0);
            }
        }
    }
}

RequestManager.prototype.host_time = {};
RequestManager.prototype.calculate_time = function(req){
    var min = this.engine.config.minimum_msec_entre_mag;
    var host = req.param.proxy;
    if (this.host_time[host] == undefined){
    	console.red("new ip" + host);
    	// dans le cas d'une premiere execution log, + instant execute;
    	this.host_time[host] = +(new Date());
    	req.wait = 0;
    } else {
    	var newdate = +(new Date());
    	if (newdate -  this.host_time[host] >= min){
    	    this.host_time[host] = newdate;
    	    req.wait = (0)
    	}
    	else{
    	    var diff = min - (newdate -  this.host_time[host]);
    	    this.host_time[host] = newdate + diff;
    	    req.wait = diff;
    	}
    }
}

RequestManager.prototype.ReqError = function(req, code){
    var id_regiment = req.param.id_regiment;
    var id_client = req.param.id_client;

    if (this.regiments[id_regiment].dead == true){
    	// une requete recu en 403 apres que le regiment soit mort
    	this.in_progress -= 1;
    	return
    }

    if (code == 403 || code == 407){
    	console.log("received "+code+" from regiment " +id_regiment + " cli:" + id_client);
    	this.engine.output.LogRegiment(id_regiment, " le client " + id_client + " s'est fait refouler(403)");
    	//On indique au membre de ce regiment qu'on a eu la reponse a la requete (il est de nouveau libre)
    	this.regiments[id_regiment].clients[id_client].reset_after_query();
    	//decremente le nombre de requete global
    	this.in_progress -= 1;
    	//Le membre du regiement se suicide (si on est en parcours de nomenclature)
    	this.regiments[id_regiment].clients[id_client].suicide();
    	//Le magasin est-il termine (eventuellement utile si ERREUR lors de la derniere requete d'un mag
    	if (req.param.requete_magasin == true){
    	    this.TestMagEnd(id_regiment);
    	}
    	//Le regiment complet se suicide si on est en recherche de magasin (avant entrée dans le magasin)
    	if (this.regiments[id_regiment].prehome == true){
    	    this.engine.output.LogRegiment(id_regiment, " 403 dans la recherche de magasin, sucide du regiment");
    	    this.regiments[id_regiment].suicide({prehome : true});
    	} else {//il y a 403/407 sur parcours de la nomenclature on remet lea requete dans le pipe

    		this.regiments[id_regiment].pending.push(req);
    	}
    } else {
    	//initialisation du compteur de retry
    	if (req.retry == undefined)
    	    req.retry = 0;
    	req.retry += 1;
    	if (req.retry == 5){
    	    this.engine.output.LogRegiment(id_regiment, " une requete est abandonnee");
    	    //requete termine le mec est de nouveau libre
    	    this.regiments[id_regiment].clients[id_client].reset_after_query();
    	    //une reqiuete de moins dans le pipe
    	    this.in_progress -= 1;

    	    this.regiments[id_regiment].reqBin.push(req.url);

    	    if (req.param.requete_magasin == true){
    		  this.TestMagEnd(id_regiment);
    	    }
    	    if (this.regiments[id_regiment].prehome == true){
        		this.engine.output.LogRegiment(id_regiment, " erreur dans la recherche de magasin, sucide du regiment");
        		this.regiments[id_regiment].suicide({prehome : true});
    	    }
    	}
    	else{
    	    if (code == 542 || code == 1024){
        		if (this.regiments[id_regiment].prehome == true){
        		    if (code == 1024 && (req.options.headers.Cookie.length == 0)){
                        var replacement = this.available_proxy.shift();
                        req.param.proxy = replacement;
                        this.regiments[id_regiment].clients[id_client].proxy = replacement;
                        req.build();
                        req.request(this);
                        console.log("REPLACEMENT " + replacement)
                        //console.log(req);
                        //process.exit(0);
        		    } else if ( req.retry > 1){
                        this.regiments[id_regiment].clients[id_client].reset_after_query();
                        this.in_progress -= 1;
                        this.regiments[id_regiment].suicide({prehome : true});
        		    } else {
                        this.engine.output.LogRegiment(id_regiment, "client:" + id_client + " retry(" + req.retry + ")");
                        this.calculate_time(req);
                        req.build();
                        req.request(this);
        		    }
        		} else {
        		    this.regiments[id_regiment].clients[id_client].reset_after_query();
        		    this.in_progress -= 1;
        		    this.regiments[id_regiment].pending.push(req);
        		}
    	    } else {
                this.engine.output.LogRegiment(id_regiment, "client:" + id_client + " retry(" + req.retry + ")");
                this.calculate_time(req);
                req.build();
                req.request(this);
    	    }
    	}
    }
    this.Execute();
}


RequestManager.prototype.CleanRequest = function(req){
    this.UpdateRegimentStatus();
    var id_regiment = req.param.id_regiment;
    var id_client = req.param.id_client;

    this.engine.output.logGlobal("arrivee de " + id_regiment + "  " + id_client);
    this.in_progress -= 1;

    // si le regiment n'existe plus, ne rien faire
    if (this.regiments[id_regiment].dead == true){
	   return
    }
    this.regiments[id_regiment].clients[id_client].reset_after_query();

    // on sauvegrade les cookies, par ip adresse
    this.regiments[id_regiment].clients[id_client].set_jar(clone(req.param.jar));

    // si il est en train de parcourir la lise des magasin & qu'une requete contient un idmagsin,
    // la prochaine les pochaine requete serons donner a la classe regiment et assigner a chaque client
    if (this.regiments[id_regiment].clients[id_client].prehome == true && req.param.MagasinId != undefined){
	   this.regiments[id_regiment].clients[id_client].prehome = false;
    }


    this.engine.output.LogRegiment(id_regiment, " arrivee de : " + id_client);
    this.regiments[id_regiment].transition_home();
    if ( this.regiments[id_regiment].prehome == true && this.regiments[id_regiment].is_complete()){
        this.engine.output.LogRegiment("le regiment "+id_regiment +" a finit, lancement de la vague suivante")
        this.regiments[id_regiment].proceed();
    }

    this.Execute();
    if (req.param.requete_magasin == true){
	   this.TestMagEnd(id_regiment);
    }
}

//Controle et maintien le nombre de regiment au max
//Gestion des Heure creuse / pleine
RequestManager.prototype.UpdateRegimentStatus = function(){
    var in_progress = 0;
    for (var i = 0; i < this.regiments.length; i++){
        if (this.regiments[i].dead != true && this.regiments[i].execStatus == true){
            in_progress++;
        }
    }

    var max = this.engine.config.mag_parrallele;

    /*
    var heurelocale = parseInt(dateFormat("HH")); // example 16h
    var day = dateFormat("dddd");
    if ((day != "Sunday" && day !=  "Saturday") // pas le WE
	&& ((heurelocale > 9 && heurelocale < 12) ||
	    (heurelocale > 14 && heurelocale < 18)))
    {
	max = 1;
	console.log("max is 1")
    }
    */

    if (in_progress < max){
        for (i = 0; i < this.regiments.length; i++){
            if (this.regiments[i].dead != true && this.regiments[i].execStatus == false){
                this.regiments[i].execStatus = true;
                this.engine.output.LogRegiment(i, "ton execStatus vient d'etre mis a true")
                return
            }
        }
    }
}

RequestManager.prototype.Execute = function(){

  var that = this;
    this.engine.output.logGlobal("tentatve d'execution d'un nouvelle req")

    this.UpdateRegimentStatus();
    // si le nombre de requete max est atteinds, ne rien faire
    //Si plus de place pour une nouvelle requete on attent (donc return)
    if (this.in_progress >= this.engine.config.nombres_requetes_paralleles)
	return

    //  demande a tous les regiments si il ont une requete a executer
    var request = undefined;
    var init = this.idx_regiment;
    while ((request = this.regiments[this.idx_regiment].get_next_request()) == undefined){
	//this.engine.output.logGlobal("exec: " +this.idx_regiment + " pas de requetes" );
	this.idx_regiment = (this.idx_regiment + 1) % this.regiments.length;
	if (init == this.idx_regiment)
	    break;
    }
    //Si la requete existe
    if (request != undefined){
    	//On tourne sur les regiement pour recuperer la prochaine requete sur
    	//le prochain membre du prochain regiement
    	this.engine.output.logGlobal("l'url viens de passer " + request.url);
    	this.engine.output.logGlobal("exec: requete trouver pour " + this.idx_regiment);
    	this.idx_regiment = (this.idx_regiment + 1) % this.regiments.length;
    	this.in_progress += 1;
    	this.calculate_time(request);
    	request.build();
    	request.request(this);
    	this.Execute();
    }
}

//Cette instruction permet d'exposer cette class.
//Un required de cette class cree une instance (comme une classe utilitaire avec des methodes static)

module.exports = {
  create : function(name, config, output){ return new RequestManager(name, config, output) }
}
