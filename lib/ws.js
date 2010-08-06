var ws = require(__dirname + '/../vendor/node-websocket-server/lib/ws');
var sys = require('sys');

/* WebSocketServer */
var WebSocketServer = function(db) {
  var self = this;

  this.db = db;
  this.server = ws.createServer();
  this.server.addListener("connection", function(connection) {
    new WebSocketSession(self, connection);
  });
};

WebSocketServer.prototype = {
  listen: function(port) { this.server.listen(port); },
  broadcast: function(message) { this.server.broadcast(message); }
};

/* WebSocketSession */
var WebSocketSession = function(parent, connection) {
  var self = this;

  this.parent = parent;
  this.connection = connection;
  this.connection.addListener("message", function(m) { self.recv.call(self, m); });
  this.connection.addListener("close", function() { self.close.call(self); });
};

WebSocketSession.prototype = {
  recv: function(message) {
    message = JSON.parse(message);
    message.id = this.connection.id;
    if (message.action == 'dragstop') {
      var db = this.parent.db;
      var magnet_id = db.ObjectID.createFromHexString(message.magnet_id);
      var magnet = db.Magnet.find({_id: magnet_id}).first(function(magnet) {
        magnet.x = message.x;
        magnet.y = message.y;
        magnet.save();
      });
    }
    this.connection.broadcast(JSON.stringify(message));
  },
  close: function() {
    var info = { 'id': this.connection.id, 'action': 'close' };
    this.connection.broadcast(JSON.stringify(info));
  }
};

exports.WebSocketServer = WebSocketServer;
