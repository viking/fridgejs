var HttpServer = require('./lib/http').HttpServer;
var WebSocketServer = require('./lib/ws').WebSocketServer;

var http = new HttpServer;
http.listen(37222);

var ws = new WebSocketServer;
ws.listen(37223);
