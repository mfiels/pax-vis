var net = require('net');

var consumers = [];
var providers = [];

var ConnectionHandlers = {

  onConnectionOpened: function(connection) {
    console.log('Client connected');
    connection.on('end', ConnectionHandlers.onConnectionClosed);
    connection.on('data', ConnectionHandlers.onConnectionData);
  },

  onConnectionClosed: function() {
    console.log('Client closed');
    for (var i = 0; i < consumers.length; i++) {
      if (consumers[i].connection == this) {
        console.log('Removed client', consumers[i].name, 'from consumers list');
        consumers.splice(i, 1);
        i--;
      }
    }
    for (var i = 0; i < providers.length; i++) {
      if (providers[i].connection == this) {
        console.log('Removed client named', providers[i].name, 'from providers list');
        providers.splice(i, 1);
        i--;
      }
    }
  },

  onConnectionData: function(data) {
    var messages = data.toString('ascii').split('\r\n');
    for (var i = 0; i < messages.length; i++) {
      if (messages[i].trim().length > 0) {
        ConnectionHandlers.onConnectionMessage(this, messages[i]);
      }
    }
  },

  onConnectionMessage: function(connection, data) {
    try {
      console.log('Got message from client', data);
      var message = JSON.parse(data);
      var action = message.action;
      var actionHandler = 'handle' + action[0].toUpperCase() + action.substring(1).toLowerCase();
      
      ActionHandlers.handleGeneric(connection, message);
      if (ActionHandlers[actionHandler]) {
        ActionHandlers[actionHandler](connection, message);
      }
    } catch (e) {
      console.log('Error parsing client message:', data, e);
    }
  },

  onListenSuccess: function() {
    console.log('Listening for connections on port 9000...');
  }

};

var SocketIoAdapter = {

  onConnectionOpened: function(socket) {
    console.log(socket);
  }

};

var ActionHandlers = {

  handleConnect: function(connection, message) {
    try {
      var type = message.type;
      var name = message.name;
      if (type == 'application') {
        var interests = message.interests;
        consumers.push(new Consumer(name, interests, connection));
        console.log('Handled connect for application named', name, 'with interests', interests);
      } else if (type == 'algorithm') {
        var configuration = message.configuration;
        providers.push(new Provider(name, configuration, connection));
        console.log('Handled connect for algorithm named', name, 'with configuration', configuration);
      }
    } catch(e) {
      console.log('Error handling connection message:', message, e);
    }
  },

  handleRequest: function(connection, message) {
    try {
      for (var i = 0; i < providers.length; i++) {
        if (providers[i].name.toLowerCase() == message.algorithm.toLowerCase()) {
          console.log('Telling', providers[i].name, 'about', message);
          providers[i].connection.write(JSON.stringify(message) + '\r\n');
        }
      }
    } catch (e) {
      console.log('Error handling request message:', message, e); 
    }
  },

  handleGeneric: function(connection, message) {
    try {
      for (var i = 0; i < consumers.length; i++) {
        if (consumers[i].interests.indexOf(message.action) != -1) {
          console.log('Telling', consumers[i].name, 'about', message);
          consumers[i].connection.write(JSON.stringify(message) + '\r\n');
        }
      }
    } catch (e) {
      console.log('Error handling generic message:', message, e);
    }
  }

};

var Consumer = function(name, interests, connection) {
  this.name = name;
  this.interests = interests;
  this.connection = connection;
};

var Provider = function(name, configuration, connection) {
  this.name = name;
  this.configuration = configuration;
  this.connection = connection;
};

var server = net.createServer(ConnectionHandlers.onConnectionOpened);
server.listen(9000, ConnectionHandlers.onListenSuccess);
