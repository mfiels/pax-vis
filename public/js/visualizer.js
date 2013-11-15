var Visualizer = function() {
  this.stage = new createjs.Stage('canvas');
  this.width = this.stage.canvas.width;
  this.height = this.stage.canvas.height;

  this.numProposers = 0;
  this.numAcceptors = 0;
  this.numLearners = 0;

  this.proposers = [];
  this.acceptors = [];
  this.learners = [];
};

Visualizer.NODE_VERTICAL_SPACING = 0.2;
Visualizer.NUM_GROUPS = 3;
Visualizer.NODE_GROUP_WIDTH = 1 / Visualizer.NUM_GROUPS;

Visualizer.PROPOSER_COLOR = 'red';
Visualizer.ACCEPTOR_COLOR = 'green';
Visualizer.LEARNER_COLOR = 'blue';

Visualizer.prototype.init = function(proposers, acceptors, learners) {
  this.numProposers = proposers;
  this.numAcceptors = acceptors;
  this.numLearners = learners;

  var largestGroupSize = Math.max(this.numProposers, this.numAcceptors, this.numLearners);
  var size = this.height * (1 - Visualizer.NODE_VERTICAL_SPACING) / largestGroupSize;

  this._addGroup(
    0 * Visualizer.NODE_GROUP_WIDTH * this.width, 
    size, 
    this.numProposers, 
    Visualizer.PROPOSER_COLOR, 
    this.proposers);
  this._addGroup(
    1 * Visualizer.NODE_GROUP_WIDTH * this.width,
    size, 
    this.numAcceptors, 
    Visualizer.ACCEPTOR_COLOR, 
    this.acceptors);
  this._addGroup(
    2 * Visualizer.NODE_GROUP_WIDTH * this.width, 
    size, 
    this.numLearners, 
    Visualizer.LEARNER_COLOR, 
    this.learners);
};

Visualizer.prototype._addGroup = function(x, size, count, color, group) {
  console.log(size);
  x += (this.width * Visualizer.NODE_GROUP_WIDTH) / 2 - size / 2;
  var y = this.height * Visualizer.NODE_VERTICAL_SPACING / (count + 1);
  for (var i = 0; i < count; i++) {
    console.log(x, y);
    var node = new createjs.Shape();
    node.graphics.beginFill(color).drawCircle(size / 2, size / 2, size / 2);
    node.x = x;
    node.y = y;
    group.push(node);
    this.stage.addChild(node);

    y += this.height * Visualizer.NODE_VERTICAL_SPACING / (count + 1) + size;
  }
};

Visualizer.prototype.update = function(e) {
  var delta = e.delta;
  this.stage.update();
};

vis = new Visualizer();
createjs.Ticker.addEventListener('tick', function(e) {
  vis.update.apply(vis, [e]);
});
