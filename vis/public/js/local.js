var io = {
  connect: function() {
    console.log('stub socket io connection');
    return {
      on: function() {
        console.log('stub socket io on');
      }
    }
  }
}

window.onload = function(e) {
  vis.init([0,1,2],[3,4],[5,6,7],[8,9]);
  vis.sendMessage(0, [3,4], 'REQ\n5,1,3');
  setTimeout(function() {
    vis.sendMessage(3, [5,6,7], 'P1A\n5,1,3');
  }, 1 * 1600);
  setTimeout(function() {
    vis.sendMessage([5,6,7], 3, 'P1B\n5,1,3');
  }, 2 * 1600);
  setTimeout(function() {
    vis.sendMessage(3, [5,6,7], 'P2A\n5,1,3');
  }, 3 * 1600);
  setTimeout(function() {
    vis.sendMessage([5,6,7], [3,8,9], 'P2B\n5,1,3');
  }, 4 * 1600);
  setTimeout(function() {
    vis.sendMessage([8,9], 0, 'RES\n5,1,3');
  }, 5 * 1600);
};
