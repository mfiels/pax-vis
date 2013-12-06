//-----Constructor-----/

var Visualizer = function() {
  this.stage = new createjs.Stage('canvas');
  this.width = this.stage.canvas.width;
  this.height = this.stage.canvas.height;

  this.initialized = false;

  this.numClients = 0;
  this.numReplicas = 0;
  this.numLeaders = 0;
  this.numAcceptors = 0;

  this.clients = {};
  this.replicas = {};
  this.leaders = {};
  this.acceptors = {};
  this.nodes = {};
  this.sprites = [];
  this.stickyAlerts = {};

  this.buffer = null;

  this.playhead = new Playhead();
  this.stage.addChild(this.playhead.buffered);
  this.stage.addChild(this.playhead.playhead);
};

//-----Constants-----/

Visualizer.NODE_VERTICAL_SPACING = 0.2;
Visualizer.NUM_GROUPS = 4;
Visualizer.NODE_GROUP_WIDTH = 1 / Visualizer.NUM_GROUPS;

Visualizer.MESSAGE_SIZE = 75;
Visualizer.SLOT_WIDTH = 30;
Visualizer.SLOT_HEIGHT = 30;
Visualizer.SLOT_SPACING = 10;
Visualizer.NUM_SLOTS = 15;

Visualizer.CLIENT_COLOR = '#F92672';
Visualizer.REPLICA_COLOR = '#66D9EF';
Visualizer.ACCEPTOR_COLOR = '#8e44ad';
Visualizer.LEARNER_COLOR = '#A6E22E';

Visualizer.MESSAGE_COLOR = '#f1c40f';

Visualizer.SHADOW_COLOR = 'black';

//-----Initialization-----/

Visualizer.prototype.init = function(clients, replicas, leaders, acceptors) {
  this.numClients = clients.length;
  this.numReplicas = replicas.length;
  this.numLeaders = leaders.length;
  this.numAcceptors = acceptors.length;

  ParametricPlugin.recordStart = createjs.Ticker.getTime();

  var largestGroupSize = Math.max(
      this.numClients, this.numReplicas, this.numLeaders, this.numAcceptors);
  var size = (this.height - 200) * (1 - Visualizer.NODE_VERTICAL_SPACING) / largestGroupSize;

  this._addGroup(
    0 * Visualizer.NODE_GROUP_WIDTH * this.width, 
    size, 
    this.numClients, 
    Visualizer.CLIENT_COLOR, 
    this.clients,
    clients,
    'C');
  this._addGroup(
    1 * Visualizer.NODE_GROUP_WIDTH * this.width, 
    size, 
    this.numReplicas, 
    Visualizer.REPLICA_COLOR, 
    this.replicas,
    replicas,
    'R');
  this._addGroup(
    2 * Visualizer.NODE_GROUP_WIDTH * this.width,
    size, 
    this.numLeaders, 
    Visualizer.ACCEPTOR_COLOR, 
    this.leaders,
    leaders,
    'L');
  this._addGroup(
    3 * Visualizer.NODE_GROUP_WIDTH * this.width, 
    size, 
    this.numAcceptors, 
    Visualizer.LEARNER_COLOR, 
    this.acceptors,
    acceptors,
    'A');

  this._initBuffer();

  this.initialized = true;
};

Visualizer.prototype._addGroup = function(x, size, count, color, group, ids, name) {
  x += (this.width * Visualizer.NODE_GROUP_WIDTH) / 2 - size / 2;
  var startY = this.height * Visualizer.NODE_VERTICAL_SPACING / (count + 1);
  var unusedHeight = this.height - (this.height * Visualizer.NODE_VERTICAL_SPACING + count * size);
  var y = startY + unusedHeight / 2;
  for (var i = 0; i < count; i++) {
    var nodeShape = new createjs.Shape();
    nodeShape.graphics.beginFill(Visualizer.SHADOW_COLOR)
      .drawCircle(size / 2 + 2, size / 2 + 2, size / 2);
    nodeShape.graphics.beginFill(color)
      .drawCircle(size / 2, size / 2, size / 2);

    var nodeText = new createjs.Text(name + ids[i], '24px Verdana', 'white');
    nodeText.x = size / 2;
    nodeText.y = size / 2 - nodeText.getMeasuredHeight() / 2.0;
    nodeText.textAlign = 'center';

    var nodeTextShadow = new createjs.Text(name + ids[i], '24px Verdana', '#272822');
    nodeTextShadow.x = size / 2 + 2;
    nodeTextShadow.y = size / 2 - nodeTextShadow.getMeasuredHeight() / 2.0 + 2;
    nodeTextShadow.textAlign = 'center';

    var nodeSprite = new createjs.Container();
    nodeSprite.x = x;
    nodeSprite.y = y;
    nodeSprite.size = size;

    group[ids[i]] = nodeSprite;
    this.nodes[ids[i]] = nodeSprite;

    nodeSprite.addChild(nodeShape);
    nodeSprite.addChild(nodeTextShadow);
    nodeSprite.addChild(nodeText);

    this.stage.addChild(nodeSprite);

    y += this.height * Visualizer.NODE_VERTICAL_SPACING / (count + 1) + size;
  }
};

Visualizer.prototype._initBuffer = function() {
  var buffer = new createjs.Container();
  this.buffer = buffer;

  buffer.startsAt = 0;
  buffer.slots = [];

  for (var i = 0; i < Visualizer.NUM_SLOTS; i++) {
    var slot = {
      x: i * (Visualizer.SLOT_WIDTH + Visualizer.SLOT_SPACING),
      y: 0.0
    };
    buffer.slots.push(slot);
    this.setSlot(i + 1, -1);
  }

  buffer.x = this.width / 2 - (Visualizer.SLOT_WIDTH + Visualizer.SLOT_SPACING) * Visualizer.NUM_SLOTS / 2;
  buffer.y = this.height - 75.0;

  this.stage.addChild(buffer);
};

//-----Spawning-----//

Visualizer.prototype.spawnChild = function(parent, child, name) {
  var parentNode = this.nodes[parent];
  this.nodes[child] = parentNode;
};

Visualizer.prototype.killChild = function(child, name) {
  //delete this.nodes[child];
};

//-----Messages-----//

Visualizer.prototype.sendMessage = function(src, dest, message, duration, color, onComplete) {
  for (var i = 0; i < src.length; i++) {
    for (var j = 0; j < dest.length; j++) {
      this._sendMessage(src[i], dest[j], message, duration, color, onComplete);
    }
  }
}

Visualizer.prototype._sendMessage = function(src, dest, message, duration, color, onComplete) {
  var messageShape = new createjs.Shape();
  messageShape.graphics.beginFill(Visualizer.SHADOW_COLOR)
    .drawCircle(
      Visualizer.MESSAGE_SIZE / 2 + 1, 
      Visualizer.MESSAGE_SIZE / 2 + 1, 
      Visualizer.MESSAGE_SIZE / 2);
  messageShape.graphics.beginFill(color ? color : Visualizer.MESSAGE_COLOR)
    .drawCircle(
      Visualizer.MESSAGE_SIZE / 2,
      Visualizer.MESSAGE_SIZE / 2,
      Visualizer.MESSAGE_SIZE / 2);

  var messageText = new createjs.Text(message, '16px Verdana', color ? 'white' : 'black');
  messageText.x = Visualizer.MESSAGE_SIZE / 2;
  messageText.y = Visualizer.MESSAGE_SIZE / 2 - messageText.getMeasuredHeight() / 2.0;
  messageText.textAlign = 'center';

  var messageSprite = new createjs.Container();
  messageSprite.addChild(messageShape);
  messageSprite.addChild(messageText);
  messageSprite.alpha = 0.0;

  var srcNode = this.nodes[src];
  var destNode = this.nodes[dest];
  
  var srcX = srcNode.x + srcNode.size / 2 - Visualizer.MESSAGE_SIZE / 2;
  var srcY = srcNode.y + srcNode.size / 2 - Visualizer.MESSAGE_SIZE / 2;
  var destX = destNode.x + destNode.size / 2 - Visualizer.MESSAGE_SIZE / 2;
  var destY = destNode.y + destNode.size / 2 - Visualizer.MESSAGE_SIZE / 2;

  messageSprite.x = srcX;
  messageSprite.y = srcY;

  this.sprites.push(messageSprite);

  var self = this;
  var tween = createjs.Tween
      .get(messageSprite)
      .to({alpha: 0.75}, 100  * Pangaea.scale)
      .to({x: destX, y: destY}, duration - 200 * Pangaea.scale, createjs.Ease.sineInOut)
      .to({alpha: 0.0}, 100  * Pangaea.scale);
  if (onComplete) {
    tween.call(onComplete);
  }

  this.stage.addChild(messageSprite);
};

Visualizer.prototype.showAlert = function(name, id, op, message, sticky) {
  var messageShape = new createjs.Shape();
  messageShape.graphics.beginFill(Visualizer.SHADOW_COLOR)
    .drawCircle(
      25 + 1, 
      25 + 1, 
      25 + 1);
  messageShape.graphics.beginFill(this.getColorCode(op))
    .drawCircle(25, 25, 25);

  var messageText = new createjs.Text(message, '16px Verdana', 'white');
  messageText.x = 25;
  messageText.y = 25 - messageText.getMeasuredHeight() / 2.0;
  messageText.textAlign = 'center';

  var messageSprite = new createjs.Container();
  messageSprite.addChild(messageShape);
  messageSprite.addChild(messageText);
  messageSprite.alpha = 0.0;

  var srcNode = this.nodes[id];
  messageSprite.x = srcNode.x;
  messageSprite.y = srcNode.y;

  this.sprites.push(messageSprite);

  if (this.stickyAlerts[id]) {
    createjs.Tween
        .get(this.stickyAlerts[id])
        .to({alpha: 0.0}, 300 * Pangaea.scale);
  }

  if (!sticky) {
    createjs.Tween
        .get(messageSprite)
        .to({alpha: 0.75}, 100 * Pangaea.scale)
        .to({y: srcNode.y - 30}, 1000 * Pangaea.scale)
        .to({alpha: 0.0}, 300 * Pangaea.scale);
  } else {
    createjs.Tween
        .get(messageSprite)
        .to({alpha: 0.75}, 100 * Pangaea.scale)
        .to({y: srcNode.y - 30}, 1000 * Pangaea.scale)
    this.stickyAlerts[id] = messageSprite;
  }

  this.stage.addChild(messageSprite);
};

Visualizer.prototype.getColorCode = function(op) {
  switch (op) {
    case 0: return 'red';
    case 1: return 'green';
    case 2: return 'blue';
  }
  return 'white';
};

//-----Slots-----//

Visualizer.prototype.setSlot = function(slot, value) {
  if ((slot - 1) - this.buffer.startsAt >= Visualizer.NUM_SLOTS) {
    this.buffer.startsAt += Visualizer.NUM_SLOTS;
    for (var i = this.buffer.startsAt + 1; i <= this.buffer.startsAt + Visualizer.NUM_SLOTS; i++) {
      this.setSlot(i, -1);
    }
  }

  var current = this.buffer.slots[(slot - 1) - this.buffer.startsAt];
  current.value = value;
  
  var container = new createjs.Container();
  container.x = current.x;
  container.y = current.y;

  var overlay = new createjs.Shape();
  overlay.graphics
      .beginFill(this.getColorCode(value))
      .drawRect(0, 0, Visualizer.SLOT_WIDTH, Visualizer.SLOT_HEIGHT);
  container.addChild(overlay);

  var text = new createjs.Text(slot, '16px Verdana', 'black');
  text.x = Visualizer.SLOT_WIDTH / 2;
  text.y = Visualizer.SLOT_HEIGHT / 2 - text.getMeasuredHeight() / 2.0;
  text.textAlign = 'center';
  container.addChild(text);

  container.alpha = 0.0;

  createjs.Tween
      .get(container)
      .to({alpha: 1.0}, 300 * Pangaea.scale);

  this.buffer.addChild(container);
  this.sprites.push(container);
};

//-----Updating-----//

Visualizer.prototype.update = function(e) {
  var delta = e.delta;

  if (vis.initialized) {
    Pangaea.tick(delta);
    this.playhead.update(delta);
  }

  if (!Pangaea.isSynced()) {
    this.sprites.forEach(function(element) {
      ParametricPlugin.transform(element, Pangaea.getPlayhead());
    });
  }

  this.stage.update();
};

//-----Instantiation-----//

vis = new Visualizer();

createjs.Tween.onStepAdded = ParametricPlugin.onStepAdded;
createjs.Ticker.setFPS(60);
createjs.Ticker.addEventListener('tick', function(e) {
  vis.update.apply(vis, [e]);
});
