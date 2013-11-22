var Playhead = function() {
  var buffered = new createjs.Shape();
  buffered.graphics.beginFill('gray').drawRect(0, 0, 1, 5);
  buffered.x = 0;
  buffered.y = 590;
  buffered.scaleX = 0.0;

  var playhead = new createjs.Shape();
  playhead.graphics.beginFill('blue').drawCircle(0.0, 0, 10);
  playhead.x = 0;
  playhead.y = 590;

  var self = this;
  playhead.addEventListener('mousedown', function(e) {
    self.playheadDown.apply(self, [e]);
  });
  playhead.addEventListener('pressup', function(e) {
    self.playheadUp.apply(self, [e]);
  });
  playhead.addEventListener('pressmove', function(e) {
    self.playheadMove.apply(self, [e]);
  });

  this.buffered = buffered;
  this.playhead = playhead;
  this.downOnPlayhead = false;
};

Playhead.MS_PER_PX = 50;

Playhead.prototype.playheadDown = function(e) {
  this.downOnPlayhead = true;
  Pangaea.pause();
  createjs.Tween.synced = false;
  Pangaea.setPlayhead(this.playhead.x * Playhead.MS_PER_PX);
};

Playhead.prototype.playheadUp = function(e) {
  this.downOnPlayhead = false;
  Pangaea.resume();
};

Playhead.prototype.playheadMove = function(e) {
  if (this.downOnPlayhead) {
    this.playhead.x = e.stageX;
    this.playhead.x = Math.min(this.playhead.x, this.buffered.scaleX);
    Pangaea.setPlayhead(this.playhead.x * Playhead.MS_PER_PX);
  }
};

Playhead.prototype.update = function(e) {
  this.buffered.scaleX = Pangaea.getClock() / Playhead.MS_PER_PX;
  if (!this.downOnPlayhead) {
    this.playhead.x = Pangaea.getPlayhead() / Playhead.MS_PER_PX;
  }
};
