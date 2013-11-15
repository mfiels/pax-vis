var Communication = function(socket, visualizer) {
  var self = this;
  this.socket = socket;
  this.socket.on('data', function(data) {
    self.data.apply(self, [data]);
  });
  this.visualizer = visualizer;
};

Communication.prototype.data = function(data) {
  console.log('got data', data);
  var actionHandler = 'on' + data.action[0].toUpperCase() + data.action.substring(1).toLowerCase();
  if (this[actionHandler]) {
    this[actionHandler](data);
  }
};

Communication.prototype.onConnect = function(message) {
  this.visualizer.init(
    message.configuration.proposers,
    message.configuration.acceptors,
    message.configuration.learners);
};

var socket = io.connect('http://localhost');
var com = new Communication(socket, vis);
