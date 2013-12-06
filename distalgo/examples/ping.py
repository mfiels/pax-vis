import multiprocessing
import time
import sys
import types
import traceback
import os
import stat
import signal
import time
import logging
import threading
import warnings
from logging import DEBUG
from logging import INFO
from logging import ERROR
from logging import CRITICAL
from logging import FATAL
from distalgo.runtime.udp import UdpEndPoint
from distalgo.runtime.tcp import TcpEndPoint
from distalgo.runtime.event import *
from distalgo.runtime.util import *
from distalgo.runtime import DistProcess


class Pong(DistProcess):

    def __init__(self, parent, initq, channel, log):
        DistProcess.__init__(self, parent, initq, channel, log)
        self._event_patterns = [EventPattern(Event.receive, 'Ping', [], [(1, 'p')], [self._event_handler_0])]
        self._sent_patterns = []
        self._label_events = {}

    def setup(self):
        pass

    def main(self):
        while (not False):
            self._process_event(self._event_patterns, True, None)

    def _event_handler_0(self, p, _timestamp, _source):
        self.output('Pinged')
        self.send(('Pong',), p)


class Ping(DistProcess):

    def __init__(self, parent, initq, channel, log):
        DistProcess.__init__(self, parent, initq, channel, log)
        self._event_patterns = [EventPattern(Event.receive, 'Pong', [], [], [self._receive_handler_0]), EventPattern(Event.receive, 'Pong', [], [], [self._event_handler_1])]
        self._sent_patterns = []
        self._label_events = {}
        self._receive_messages_0 = list()

    def setup(self, p):
        pass
        self.p = p

    def main(self):
        while True:
            self.purge_received()
            self.send(('Ping', self._id), self.p)
            while (not self._has_receive_0()):
                self._process_event(self._event_patterns, True, None)
            self.work()

    def _event_handler_1(self, _timestamp, _source):
        self.output('Ponged.')

    def _receive_handler_0(self, _timestamp, _source):
        self._receive_messages_0.append(True)

    def _has_receive_0(self):
        return {True for v_ in self._receive_messages_0}

def main():
    pong = createprocs(Pong, 1)
    ping = createprocs(Ping, 3)
    setupprocs(ping, [pong])
    startprocs(pong)
    startprocs(ping)
    for p in pong:
        p.join()