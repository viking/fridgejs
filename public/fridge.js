var limit = 50;
function rateLimit(fn) {
  var last = (new Date()).getTime();
  return (function() {
    var now = (new Date()).getTime();
    if (now - last > limit) {
      last = now;
      fn.apply(null, arguments);
    }
  });
}

$.fn.fridge = function(options) {
  var fridge = new $.fridge(this, options);
  return this;
};
$.fridge = function(obj, options) {
  var self = this;
  this.conn = new WebSocket("ws://"+options.host+":37223");
  this.conn.onmessage = function(e) { self.messageReceived.call(self, e) };

  $(document).bind('mousemove', this, rateLimit(this.mousemove));
  obj.find('.magnet').draggable({containment: 'parent'})
    .bind('drag',     this, rateLimit(this.drag))
    .bind('dragstop', this, this.dragstop);

  this.target = obj;
};
$.fridge.prototype = {
  messageReceived: function(evt) {
    data = JSON.parse(evt.data);
    mouse = $('#mouse-'+data.id);

    if (data.action == 'close') {
      mouse.remove();
    }
    else {
      if (mouse.length == 0) {
        mouse = $('<div id="mouse-'+data.id+'" class="mouse" style="display: none;"></div>');
        $('body').append(mouse);
      }

      if (data.action == "mousemove") {
        //var css = { left: (($(document).width() - data.w) / 2 + data.x) + 'px', top:  data.y + 'px' };
        var css = { left: data.x + 'px', top: data.y + 'px' };
        if (mouse.is(':visible')) {
          mouse.animate(css, limit);
        }
        else {
          mouse.css(css).show();
        }
      }
      else if (data.action.match(/^drag/)) {
        var magnet = $('#magnet-'+data.magnet_id)
        var callback = undefined;
        if (data.action == 'dragstop') {
          callback = function() { $(this).draggable('option', 'disabled', false); }
        }
        else {
          magnet.draggable('option', 'disabled', true);
        }
        magnet.animate({ left: data.x + 'px', top: data.y + 'px' }, limit, callback);
      }
    }
  },
  mousemove: function(e) {
    var self = e.data;
    self.conn.send(JSON.stringify({
      'action': 'mousemove',
      'x': e.pageX,
      'y': e.pageY
      //'w': $(document).width(),
      //'h': $(document).height()
    }));
  },
  drag: function(e, ui) {
    var self = e.data;

    var target = $(e.target);
    var magnet_id = target.attr('id').replace(/^magnet-/, '');
    var position = target.position();
    self.conn.send(JSON.stringify({
      'action': 'drag',
      'magnet_id': magnet_id,
      'x': position.left,
      'y': position.top
    }));
  },
  dragstop: function(e, ui) {
    var self = e.data;

    var target = $(e.target);
    var magnet_id = target.attr('id').replace(/^magnet-/, '');
    var position = target.position();
    self.conn.send(JSON.stringify({
      'action': 'dragstop',
      'magnet_id': magnet_id,
      'x': position.left,
      'y': position.top
    }));
  }
}
