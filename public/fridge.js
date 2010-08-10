var limit = 50;
function rateLimit(fn, ctx) {
  if (typeof(ctx) == 'undefined')
    ctx = null;

  var last = (new Date()).getTime();
  return (function() {
    var now = (new Date()).getTime();
    if (now - last > limit) {
      last = now;
      fn.apply(ctx, arguments);
    }
  });
}

$.fn.fridge = function(options) {
  var fridge = new $.fridge(this, options);
  this.data('fridge', fridge);
  return this;
};
$.fridge = function(obj, options) {
  var self = this;
  this.target = obj;

  this.conn = new WebSocket("ws://"+options.host+":37223");
  this.conn.onmessage = function(e) { self.messageReceived.call(self, e) };

  this.paper = Raphael(obj.attr('id'), obj.width(), obj.height());
  //this.font = this.paper.getFont('Junction');

  this.magnets = {};
  options.magnets.forEach(function(m) {
    this.magnets[m._id] = new $.magnet(this, m);
  }, this);

  $(document).bind('mousemove', this, rateLimit(this.mousemove));
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
        var magnet = this.magnets[data.magnet_id];
        if (magnet)
          magnet.process(data.action, data.x, data.y);
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
  }
};

$.magnet = function(parent, attribs) {
  //this.word = parent.paper.print(
    //attribs.x + 5, attribs.y + 13, attribs.value,
    //parent.font, 15
  //).attr({'text-anchor': 'start'});
  this.word = parent.paper.text(
    attribs.x + 6, attribs.y + 12, attribs.value
  ).attr({'font-family': 'verdana', 'font-size': 13, 'text-anchor': 'start'});

  var wordBBox = this.word.getBBox();
  this.rect = parent.paper.rect(
    attribs.x, attribs.y, wordBBox.width + 12, 25
  ).attr({fill: 'white', stroke: 'black'}).insertBefore(this.word);

  var self = this;
  this.set = parent.paper.set(this.word, this.rect);
  this.set.drag(
    function(dx, dy) { self.drag.call(self, dx, dy) },
    function() { self.startDrag.call(self) },
    function() { self.endDrag.call(self)   }
  );
  this.id = attribs._id;
  this.parent = parent;
  this.draggable = true;
};
$.magnet.prototype = {
  startDrag: function() {
    if (!this.draggable) return;
    this.rect.attr({fill: 'green', opacity: 0.9}).toFront();
    this.word.attr({fill: 'white', opacity: 0.9}).toFront();
    this.lastTime = (new Date()).getTime();

    var bbox = this.set.getBBox();
    this.ox = bbox.x;
    this.oy = bbox.y;
    this.dx = this.dy = 0;

    this.parent.conn.send(JSON.stringify({
      'action': 'dragstart',
      'magnet_id': this.id,
      'x': bbox.x,
      'y': bbox.y
    }));
  },
  drag: function(dx, dy) {
    if (!this.draggable) return;
    this.set.translate(dx - this.dx, dy - this.dy);
    this.dx = dx;
    this.dy = dy;

    var now = (new Date()).getTime();
    if (now - this.lastTime > limit) {
      this.lastTime = now;
      this.parent.conn.send(JSON.stringify({
        'action': 'drag',
        'magnet_id': this.id,
        'x': this.ox + dx,
        'y': this.oy + dy
      }));
    }
  },
  endDrag: function() {
    if (!this.draggable) return;
    this.rect.attr({fill: 'white', opacity: 1});
    this.word.attr({fill: 'black', opacity: 1});

    var bbox = this.set.getBBox();
    this.parent.conn.send(JSON.stringify({
      'action': 'dragstop',
      'magnet_id': this.id,
      'x': bbox.x,
      'y': bbox.y
    }));
  },
  move: function(x, y, callback) {
    var dx = x - this.rect.attr('x');
    var dy = y - this.rect.attr('y');

    this.rect.animate({
      x: this.rect.attr('x') + dx,
      y: this.rect.attr('y') + dy
    }, limit, callback);
    this.word.animateWith(this.rect, {
      x: this.word.attr('x') + dx,
      y: this.word.attr('y') + dy
    }, limit);
  },
  process: function(action, x, y) {
    var callback = undefined;
    if (action == 'dragstart') {
      this.draggable = false;
      this.rect.attr({fill: 'red'}).toFront();
      this.word.attr({fill: 'white'}).toFront();
    }
    else if (action == 'dragstop') {
      var self = this;
      callback = function() {
        self.draggable = true;
        self.rect.attr({fill: 'white'});
        self.word.attr({fill: 'black'});
      }
    }
    this.move(x, y, callback);
  }
};
