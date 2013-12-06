from distalgo.runtime import DistProcess
from distalgo.runtime.endpoint import EndPoint
from distalgo.runtime.tcp import TcpEndPoint
from distalgo.runtime.udp import UdpEndPoint

import examples.api as api

import json
import time
import threading

class VisualizedDistProcess(DistProcess):

  def __init__(self, parent, initpipe, channel, loginfo, name=None):
    super(VisualizedDistProcess, self).__init__(parent, initpipe, channel, loginfo, name)
    self.event_processed = self.recv
    self.after_spawn = self.spwn
    self.before_termination = self.term

  def _to_msg_list_(self, msg_body):
    msg_list = list()
    for i in range(0, len(msg_body)):
      if type(msg_body[i]) is tuple or type(msg_body[i]) is set:
        msg_list.append(self._to_msg_list_(list(msg_body[i])))
      elif type(msg_body[i]) is EndPoint or type(msg_body[i]) is TcpEndPoint or type(msg_body[i]) is UdpEndPoint:
        msg_list.append(msg_body[i]._address[1])
      else:
        msg_list.append(msg_body[i])
    return msg_list

  def send(self, data, to):
    if type(to) is not set:
      to = [to]

    msg_from = int(self._id._address[1])
    msg_to = [t._address[1] for t in to]
    msg_type = data[0]
    msg_body = self._to_msg_list_(data[1:])
    msg_id = self._logical_clock

    msg_dict = dict()
    msg_dict['action'] = msg_type
    msg_dict['src'] = msg_from
    msg_dict['emitter'] = msg_from
    msg_dict['dest'] = msg_to
    msg_dict['body'] = msg_body
    msg_dict['id'] = msg_id

    api.send_inc(msg_dict)
    
    time.sleep(0.200)

    super(VisualizedDistProcess, self).send(data, to)

  def recv(self, e):
    msg_from = int(e.source._address[1])
    msg_to = int(self._id._address[1])
    msg_type = e.data[0]
    msg_body = self._to_msg_list_(e.data[1:])
    msg_id = e.timestamp

    msg_dict = dict()
    msg_dict['action'] = msg_type
    msg_dict['src'] = msg_from
    msg_dict['emitter'] = msg_to
    msg_dict['dest'] = msg_to
    msg_dict['body'] = msg_body
    msg_dict['id'] = msg_id

    api.send_inc(msg_dict)

  def spwn(self, cid, name):
    api.send_spawn(int(self._id._address[1]), int(cid._address[1]), name)

  def term(self, name):
    api.send_term(int(self._id._address[1]), name)
