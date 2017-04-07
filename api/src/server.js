var express = require('express')
var routes = require('./app/routes/collect');
var config = require('./../config.json')
var app = express()

var http_port = config['port-http'] ? config['port-http']: 3001


console.log(config);

app.use('/api', routes)

console.log("server is listening on part",http_port);
app.listen(http_port)
