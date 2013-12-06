;(function(global) {

  var Pangaea = function() {
    this._clock = 0.0;
    this._playhead = 0.0;
    this._synced = true;
    this._playheadPaused = false;
    this._clockPaused = false;
    this._listeners = [];
    this.scale = 1 / 5.0;
  };

  Pangaea.prototype.tick = function(delta) {

    if (!this._clockPaused) {
      this._clock += delta;
    }

    if (!this._playheadPaused) {
      if (this._synced) {
        this._playhead = this._clock;
      } else {
        this._playhead += delta * this.scale;
      }
    }
  };

  Pangaea.prototype.setPlayhead = function(value) {
    this._playhead = value;
    this._synced = false;
  };

  Pangaea.prototype.getClock = function() {
    return this._clock;
  };

  Pangaea.prototype.getPlayhead = function() {
    return this._playhead;
  };

  Pangaea.prototype.isSynced = function() {
    return this._synced;
  };

  Pangaea.prototype.sync = function() {
    this._playhead = this._clock;
  };

  Pangaea.prototype.pause = function() {
    this._playheadPaused = true;
  };

  Pangaea.prototype.resume = function() {
    this._playheadPaused = false;
  };

  Pangaea.prototype.addListener = function() {

  };

  global.Pangaea = new Pangaea();

})(this);
