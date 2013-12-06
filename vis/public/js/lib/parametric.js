;(function(global) {

  var ParametricPlugin = {
    table: {},
    nextId: 1,
    recordStart: 0.0,

    onTweenRegistered: function(tween) {
    },

    onStepAdded: function(tween, step) {
      var target = tween.target;

      var startTime = tween.startedAt - ParametricPlugin.recordStart;
      for (var key in step.p1) {
        var slice = new ParametricSlice(
          startTime + step.t,
          startTime + step.t + step.d,
          ParametricPlugin.getLatestValue(target, key),
          step.p1[key],
          step.e ? step.e : createjs.Ease.linear
        );
        ParametricPlugin.addSlice(target, key, slice);
      }
    },

    addSlice: function(target, param, slice) {
      var row = ParametricPlugin.getRow(target, param);
      if (row.length == 0) {
        row.push(new ParametricSlice(
          0.0,
          slice.start,
          slice.v0,
          slice.v0,
          createjs.Ease.linear
        ));
        row.push(new ParametricSlice(
          slice.end,
          Number.MAX_VALUE,
          slice.v0,
          slice.v0,
          createjs.Ease.constant
        ));
      } else {
        row[row.length - 2].end = slice.start;
      }
      var inf = row.splice(row.length - 1, 1)[0];
      inf.start = slice.end;
      inf.v0 = slice.v1;
      inf.v1 = slice.v1;

      row.push(slice);
      row.push(inf);
    },

    transform: function(target, time) {
      var table = ParametricPlugin.getPropertiesTable(target);
      for (var key in table) {
        var row = ParametricPlugin.getRow(target, key);
        var slice = searchRange(row, time);
        var t = (time - slice.start) / (slice.end - slice.start);
        target[key] = slice.v0 + (slice.v1 - slice.v0) * slice.f(t);
      }
    },

    getPropertiesTable: function(target) {
      if (!target.__PARAMETRIC_TWEEN_ID__) {
        target.__PARAMETRIC_TWEEN_ID__ = ParametricPlugin.nextId++;
        ParametricPlugin.table[target.__PARAMETRIC_TWEEN_ID__] = {};
      }
      return ParametricPlugin.table[target.__PARAMETRIC_TWEEN_ID__];
    },

    getRow: function(target, param) {
      var table = ParametricPlugin.getPropertiesTable(target);
      if (!table[param]) {
        table[param] = [];
      }
      return table[param];
    },

    getLatestValue: function(target, param) {
      var row = ParametricPlugin.getRow(target, param);
      if (row.length > 0) {
        // TODO: This won't work with multiple overlapping tweens on same object
        return row[row.length - 2].v1;
      }
      return target[param];
    }
  };

  var ParametricSlice = function(start, end, v0, v1, f) {
    this.start = start;
    this.end = end;
    this.v0 = v0;
    this.v1 = v1;
    this.f = f;
  };

  createjs.Ease.constant = function(t) { return 1; };

  // Taken and modified from: 
  //    http://oli.me.uk/2013/06/08/searching-javascript-arrays-with-a-binary-search/
  function searchRange(row, value) {
    var minIndex = 0;
    var maxIndex = row.length - 1;
    var currentIndex;
    var currentElement;

    while (minIndex <= maxIndex) {
        currentIndex = (minIndex + maxIndex) / 2 | 0;
        currentElement = row[currentIndex];

        if (currentElement.end <= value) {
            minIndex = currentIndex + 1;
        }
        else if (currentElement.start > value) {
            maxIndex = currentIndex - 1;
        }
        else {
            return currentElement;
        }
    }

    return -1;
  }

  global.ParametricPlugin = ParametricPlugin;

})(this);
