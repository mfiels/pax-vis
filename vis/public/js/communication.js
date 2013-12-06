var Communication = function(socket, visualizer) {
  var self = this;
  this.socket = socket;
  this.socket.on('data', function(data) {
    self.data.apply(self, [data]);
  });
  this.visualizer = visualizer;
  this.sentMessages = {};
  this.slotMessages = {};
  this.bufferedMessages = [];
};

Communication.ALGORITHM_MESSAGES = [
  'Request', 'Propose', 'Adopted', 'Decision', 'Response',
  'P1a', 'P1b', 'P2a', 'P2b', 'Preempted'
];

Communication.PROCESS_MESSAGES = [
  'Spawn', 'Terminate'
];

Communication.ALERT_MESSAGES = [
  'Request'
];

Communication.prototype.data = function(data) {
  if (data.action == 'Connect') {
    this.onConnect(data);
  }

  if (Communication.ALGORITHM_MESSAGES.indexOf(data.action) != -1) {
    this.onAlgorithmMessage(data);
  }

  if (Communication.PROCESS_MESSAGES.indexOf(data.action) != -1) {
    this.onProcessMessage(data);
  }

  if (Communication.ALERT_MESSAGES.indexOf(data.action) != -1) {
    this.onAlertMessage(data);
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
  if (message.src.constructor == Number) {
    message.src = [message.src];
  }
  if (message.dest.constructor == Number) {
    message.dest = [message.dest];
  }
  if (message.src[0] == message.emitter) {
    this.onAlgorithmMessageSent(message);
  } else {
    this.onAlgorithmMessageArrived(message);
  }
};

Communication.prototype.messageToId = function(message, i, j) {
  return message.src[i] + '-' + message.dest[j] + '-' + message.action + '-' + message.id;
};

Communication.prototype.onAlgorithmMessageSent = function(message) {
  for (var i = 0; i < message.src.length; i++) {
    for (var j = 0; j < message.dest.length; j++) {
      var id = this.messageToId(message, i, j);
      this.sentMessages[id] = message.time;
    }
  }
};

Communication.prototype.makeDecisionCallBack = function(message, j) {
  return function() {
    message.value = message.body[1][2];
    message.slot = message.body[0];

    vis.showAlert('Slot', message.dest[j], message.value, message.slot, false);
    if (com.slotMessages[message.slot] == undefined) {
      com.slotMessages[message.slot] = com.visualizer.numReplicas;
    }
    com.slotMessages[message.slot]--;
    if (com.slotMessages[message.slot] == 0) {
      com.visualizer.setSlot(message.slot, message.value);
    }
  };
}

Communication.prototype.onAlgorithmMessageArrived = function(message) {
  for (var i = 0; i < message.src.length; i++) {
    for (var j = 0; j < message.dest.length; j++) {
      var id = this.messageToId(message, i, j);
      if (this.sentMessages[id]) {
        var duration = message.time - this.sentMessages[id];
        delete this.sentMessages[id];
        var color;
        var onComplete;
        if (message.action == 'Decision') {
          color = this.visualizer.getColorCode(message.body[1][2]);
          onComplete = this.makeDecisionCallBack(message, j);
        }
        if (message.action == 'Request') {
          color = this.visualizer.getColorCode(message.body[0][2]);
        }
        if (message.action == 'Propose') {
          color = this.visualizer.getColorCode(message.body[1][2]);
        }
        if (message.action == 'P2a') {
          color = this.visualizer.getColorCode(message.body[1][2][2]);
        }
        this.visualizer.sendMessage(message.src, message.dest, message.action, duration, color, onComplete);
      } else {
        console.warn('oh noes ' + id + ': ' + message.action);
      }
    }
  }
};

Communication.prototype.onProcessMessage = function(message) {
  if (message.action == 'Spawn') {
    this.visualizer.spawnChild(message.parent, message.child, message.name);
  } else {
    this.visualizer.killChild(message.id, message.name);
  }
};

Communication.prototype.onAlertMessage = function(message) {
  if (message.action == 'Request') {
    if (message.emitter == message.src) {
      this.visualizer.showAlert(
        message.action, message.src, message.body[0][2], 'req', true);
    }
  }
};

var socket = io.connect('http://localhost');
var com = new Communication(socket, vis);
