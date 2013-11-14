var ns = require('node-static');
var http = require('http');
var io = require('socket.io');
var net = require('net');

var file = new ns.Server('./public');

var HttpServer = {

  onRequest: function(req, res) {
    req.addListener('end', function() {
      file.serve(req, res);
    }).resume();
  },

};

var IoServer = {

  socket: null,

  onConnection: function(socket) {
    IoServer.socket = socket;
    socket.on('data', IoServer.onData);
    socket.on('disconnect', IoServer.onDisconnect);
  },

  onData: function(data) {
  },

  onDisconnect: function(data) {
  },

  sendData: function(data) {
    IoServer.socket.emit('data', JSON.parse(data));
  }

};

var ApiSocket = {

  socket: null,

  onConnection: function() {
    ApiSocket.socket.on('data', ApiSocket.onData);
    ApiSocket.socket.on('end', ApiSocket.onEnd);

    ApiSocket.sendConnectionInfo();
  },

  sendConnectionInfo: function() {
    var connectMessage = {
      'action': 'connect',
      'type': 'application',
      'name': 'visualizer',
      'interests': [
        'request',
        'prepare',
        'promise',
        'propose',
        'accept',
        'nack',
        'response'
      ]
    };

    ApiSocket.socket.write(JSON.stringify(connectMessage) + '\r\n');
  },

  onData: function(data) {
    var messages = data.toString('ascii').split('\r\n');
    for (var i = 0; i < messages.length; i++) {
      if (messages[i].trim().length > 0) {
        IoServer.sendData(messages[i]);
      }
    }
  },

  onEnd: function() {
    console.log('Closed');
  }

};

var server = http.createServer(HttpServer.onRequest).listen(8080);
var ioServer = io.listen(server);
ioServer.sockets.on('connection', IoServer.onConnection);
ApiSocket.socket = net.connect(9000, 'localhost', ApiSocket.onConnection);

console.log('HTTP server and Socket.io listening on 8080...');
