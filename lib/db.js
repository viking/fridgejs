var sys = require('sys');
require.paths.unshift(__dirname+'/../vendor/mongoose');
var mongoose = require('mongoose').Mongoose;
mongoose.model('Magnet', {
  properties: ['x', 'y', 'value'],
  methods: {
    div: function() {
      var id = this._id.toHexString();
      return("<div id='magnet-"+id+"' class='magnet' style='left: "+this.x+"px; top: "+this.y+"px;'>"+this.value+"</div>");
    }
  }
});

var db = mongoose.connect('mongodb://localhost/fridgejs');
exports.db = db;
exports.ObjectID = require('mongodb').ObjectID;
exports.Magnet = db.model('Magnet');
