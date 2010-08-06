var db = require('./lib/db');
var HttpServer = require('./lib/http').HttpServer;
var WebSocketServer = require('./lib/ws').WebSocketServer;

var http = new HttpServer(db);
http.listen(37222);

var ws = new WebSocketServer(db);
ws.listen(37223);
