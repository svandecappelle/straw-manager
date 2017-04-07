var request = require("request");
var fs = require("fs");

request({
	url : "http://account.fineproxy.org/api/getproxy",
    qs : {
	format : "txt",
	type: "httpip",
	login : "SuperVIP205927",
	password : "pVzLRAIuSD",
    }}, function(error, _ , body){
				if (!error){
	    		fs.writeFileSync("//192.168.1.106/PartageCommun/Dev_Aspiration/prx/sharedProxy", body);
	    		fs.writeFileSync("//192.168.1.106/PartageCommun/Dev_Aspiration/prx/proxyRU.txt", body);
	    		console.log("proxy update ok");
				}else{
	    		console.warn("proxy update failed")
				}
    });
