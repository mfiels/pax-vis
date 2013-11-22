//-----Constructor-----/

var Visualizer = function() {
  this.stage = new createjs.Stage('canvas');
  this.width = this.stage.canvas.width;
  this.height = this.stage.canvas.height;

  this.numClients = 0;
  this.numProposers = 0;
  this.numAcceptors = 0;
  this.numLearners = 0;

  this.clients = {};
  this.proposers = {};
  this.acceptors = {};
  this.learners = {};
  this.nodes = {};
  this.sprites = [];

  this.playhead = new Playhead();
  this.stage.addChild(this.playhead.buffered);
  this.stage.addChild(this.playhead.playhead);
};

//-----Constants-----/

Visualizer.NODE_VERTICAL_SPACING = 0.2;
Visualizer.NUM_GROUPS = 4;
Visualizer.NODE_GROUP_WIDTH = 1 / Visualizer.NUM_GROUPS;

Visualizer.MESSAGE_SIZE = 75;

Visualizer.CLIENT_COLOR = '#F92672';
Visualizer.PROPOSER_COLOR = '#66D9EF';
Visualizer.ACCEPTOR_COLOR = '#8e44ad';
Visualizer.LEARNER_COLOR = '#A6E22E';

Visualizer.MESSAGE_COLOR = '#f1c40f';

Visualizer.SHADOW_COLOR = 'black';

//-----Initialization-----/

Visualizer.prototype.init = function(clients, proposers, acceptors, learners) {
  this.numClients = clients.length;
  this.numProposers = proposers.length;
  this.numAcceptors = acceptors.length;
  this.numLearners = learners.length;

  var largestGroupSize = Math.max(this.numProposers, this.numAcceptors, this.numLearners);
  var size = this.height * (1 - Visualizer.NODE_VERTICAL_SPACING) / largestGroupSize;

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
    this.numProposers, 
    Visualizer.PROPOSER_COLOR, 
    this.proposers,
    proposers,
    'P');
  this._addGroup(
    2 * Visualizer.NODE_GROUP_WIDTH * this.width,
    size, 
    this.numAcceptors, 
    Visualizer.ACCEPTOR_COLOR, 
    this.acceptors,
    acceptors,
    'A');
  this._addGroup(
    3 * Visualizer.NODE_GROUP_WIDTH * this.width, 
    size, 
    this.numLearners, 
    Visualizer.LEARNER_COLOR, 
    this.learners,
    learners,
    'L');
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

//-----Messages-----//

Visualizer.prototype.sendMessage = function(src, dest, message) {
  if (src.constructor == Number) {
    src = [src];
  }
  if (dest.constructor == Number) {
    dest = [dest];
  }

  for (var i = 0; i < src.length; i++) {
    for (var j = 0; j < dest.length; j++) {
      this._sendMessage(src[i], dest[j], message);
    }
  }
}

Visualizer.prototype._sendMessage = function(src, dest, message) {
  var messageShape = new createjs.Shape();
  messageShape.graphics.beginFill(Visualizer.SHADOW_COLOR)
    .drawCircle(
      Visualizer.MESSAGE_SIZE / 2 + 1, 
      Visualizer.MESSAGE_SIZE / 2 + 1, 
      Visualizer.MESSAGE_SIZE / 2);
  messageShape.graphics.beginFill(Visualizer.MESSAGE_COLOR)
    .drawCircle(
      Visualizer.MESSAGE_SIZE / 2,
      Visualizer.MESSAGE_SIZE / 2,
      Visualizer.MESSAGE_SIZE / 2);

  var messageText = new createjs.Text(message, '16px Verdana', 'black');
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
  createjs.Tween
      .get(messageSprite)
      .to({alpha: 1.0}, 300)
      .to({x: destX, y: destY}, 1000, createjs.Ease.sineInOut)
      .to({alpha: 0.0}, 300);

  this.stage.addChild(messageSprite);
};

//-----Updating-----//

Visualizer.prototype.update = function(e) {
  var delta = e.delta;

  Pangaea.tick(delta);
  this.playhead.update(delta);

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
