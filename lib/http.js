var sys = require('sys');
var http = require('http');
var url = require('url');
var path = require('path');
var fs = require('fs');
var jade = require('../vendor/jade/lib/jade');

var HttpServer = function(db) {
  var self = this;
  this.db = db;
  this.server = http.createServer(function(req, res) { self.process.call(self, req, res); });
  this.routes = [
    [ /^\/$/, this.index ],
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
  render: function(path, locals, response) {
    jade.renderFile(__dirname + '/../views/' + path + '.jade', {locals: locals}, function(err, html) {
      if (err) {
        sys.puts(err);
        response.writeHead(500);
        response.end("Something went wrong!");
      }
      else {
        response.writeHead(200, {
          'Content-Type': "text/html; charset=UTF-8",
          'Content-Length': html.length,
        });
        response.end(html);
      }
    });
  },
  listen: function(port) {
    this.server.listen(port);
  },

  /* actions */
  index: function(request, response, md) {
    var self = this;
    var hostPort = request.headers.host.split(/:/);
    this.db.Magnet.find().all(function(magnets) {
      var str = "[" + magnets.map(function(x) { return(x.toJSON()) }).join(",") + "]";
      self.render('index', {magnets: str, host: hostPort[0]}, response);
    });
  },

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

        fs.readFile(file, function(err, data) {
          response.writeHead(200, {
            'Content-Type': type + "; charset=UTF-8",
            'Content-Length': data.length,
          });
          response.end(data);
        });
      }
    });
  }
}

exports.HttpServer = HttpServer;
