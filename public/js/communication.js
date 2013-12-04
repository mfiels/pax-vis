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
  switch (data.action) {
    case 'connect':
      this.onConnect(data);
      break;
    case 'prepare':
    case 'promise':
    case 'propose':
    case 'accept':
    case 'nack': 
      this.onAlgorithmMessage(data);
  }
};

Communication.prototype.onConnect = function(message) {
  if (message.type == 'algorithm') {
    this.visualizer.init(
      message.configuration.clients,
      message.configuration.replicas,
      message.configuration.leaders,
      message.configuration.acceptors);
  }
};

Communication.prototype.onAlgorithmMessage = function(message) {
  this.visualizer.sendMessage(message.src, message.dest, message);
};

var socket = io.connect('http://localhost');
var com = new Communication(socket, vis);
