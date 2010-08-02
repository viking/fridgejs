var sys = require('sys');
var http = require('http');
var url = require('url');
var path = require('path');
var fs = require('fs');

var HttpServer = function() {
  var self = this;
  this.server = http.createServer(function(req, res) { self.process.call(self, req, res); });
  this.routes = [
    [ /^\/(.*)$/, this.staticFile ]
  ];
};

HttpServer.prototype = {
  process: function(request, response) {
    var md, route, rurl;

    rurl = url.parse(request.url, true);
    for (var i = 0; i < this.routes.length; i++) {
      route = this.routes[i];
      if (md = rurl.pathname.match(route[0])) {
        route[1].call(this, request, response, md);
        break;
      }
    }
  },
  listen: function(port) {
    this.server.listen(port);
  },

  /* actions */
  staticFile: function(request, response, md) {
    // try to serve a public file
    var file = __dirname + "/../public/" + (md[1] ? md[1] : 'index.html');
    path.exists(file, function(exists) {
      if (!exists) {
        response.writeHead(404);
        response.end("Not found: " + sys.inspect(request.url));
      }
      else {
        md = file.match(/\.(\w+?)$/);
        var type = 'text/plain';
        switch(md[1]) {
        case 'html':
          type = 'text/html';
          break;
        case 'css':
          type = 'text/css';
          break;
        case 'js':
          type = 'text/javascript';
          break;
        case 'png':
          type = 'image/png';
          break;
        }

        response.writeHead(200, { 'Content-Type': type });
        fs.readFile(file, function(err, data) {
          response.end(data);
        });
      }
    });
  }
}

exports.HttpServer = HttpServer;
