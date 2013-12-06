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
from random import randint
import sys
import copy
NOPS = 10
operations = {i: lambda state: ((state + i), (state + i)) for i in 
range(NOPS)}


class Replica(DistProcess):

    def __init__(self, parent, initq, channel, log):
        DistProcess.__init__(self, parent, initq, channel, log)
        self._event_patterns = [EventPattern(Event.receive, 'Request', [], [(1, 'p')], [self._event_handler_0]), EventPattern(Event.receive, 'Decision', [], [(1, 'p')], [self._event_handler_1])]
        self._sent_patterns = []
        self._label_events = {}

    def setup(self, leaders, acceptors, initial_state):
        self.state = initial_state
        self.proposal = ()
        self.initial_state = initial_state
        self.acceptors = acceptors
        self.leaders = leaders

    def main(self):
        while (not False):
            self._process_event(self._event_patterns, True, None)

    def propose(self, p):
        self.proposal = p
        self.send(('Propose', p), (self.leaders | self.acceptors))
        self.output('Done proposing')

    def perform(self, p):
        (k, cid, op) = p
        (next, result) = operations[op](self.state)
        self.state = next
        self.output('sending another response')
        self.send(('Response', cid, result), k)
        sys.exit(0)

    def _event_handler_0(self, p, _timestamp, _source):
        self.output('send proposal')
        self.propose(p)

    def _event_handler_1(self, p, _timestamp, _source):
        self.perform(p)


class Acceptor(DistProcess):

    def __init__(self, parent, initq, channel, log):
        DistProcess.__init__(self, parent, initq, channel, log)
        self._event_patterns = [EventPattern(Event.receive, 'P1a', [], [(1, 'lam'), (2, 'b')], [self._event_handler_0]), EventPattern(Event.receive, 'P2a', [], [(1, 'lam'), (2, 'load')], [self._event_handler_1]), EventPattern(Event.receive, 'Any', [], [(1, 'lam'), (2, 'b')], [self._event_handler_2]), EventPattern(Event.receive, 'Propose', [], [(1, 'p')], [self._event_handler_3])]
        self._sent_patterns = []
        self._label_events = {}

    def setup(self):
        self.ballot_num = ((-1), (-1))
        self.accepted = set()
        self.proposals = list()

    def main(self):
        while (not False):
            self._process_event(self._event_patterns, True, None)

    def _event_handler_0(self, lam, b, _timestamp, _source):
        self.output('In P1a')
        if (b > self.ballot_num):
            self.ballot_num = b
        self.send(('P1b', self._id, self.ballot_num, self.accepted), lam)
        self.output('Acceptor sent p1b')

    def _event_handler_1(self, lam, load, _timestamp, _source):
        (b, p) = load
        if (b >= self.ballot_num):
            self.ballot_num = b
            self.accepted.add((self._id, b, p))
        self.send(('P2b', self._id, self.ballot_num, p), lam)

    def _event_handler_2(self, lam, b, _timestamp, _source):
        if (b >= self.ballot_num):
            self.ballot_num = b
        p = self.proposals.pop(0)
        print(self.proposals)
        print(p)
        self.accepted.add((self._id, b, p))
        self.send(('P2b', self._id, self.ballot_num, p), lam)
        self.output('Sent P2b')

    def _event_handler_3(self, p, _timestamp, _source):
        self.proposals.append(p)


class Leader(DistProcess):

    def __init__(self, parent, initq, channel, log):
        DistProcess.__init__(self, parent, initq, channel, log)
        self._event_patterns = [EventPattern(Event.receive, 'Propose', [], [(1, 'p')], [self._event_handler_0]), EventPattern(Event.receive, 'Adopted', [], [(1, 'ballot_num_'), (2, 'pvals'), (3, 'subset')], [self._event_handler_1]), EventPattern(Event.receive, 'Preempted', [], [(1, 'b'), (2, 'round_type')], [self._event_handler_2])]
        self._sent_patterns = []
        self._label_events = {}

    def setup(self, acceptors, replicas):
        self.ballot_num = (0, self._id)
        self.active = False
        self.proposal = set()
        self.quorum = self.form_quorum(acceptors)
        self.acceptors = acceptors
        self.replicas = replicas

    def main(self):
        self.output('Spawning Scout')
        self.spawn(Scout, [self._id, self.acceptors, self.ballot_num, self.quorum, 0])
        while (not False):
            self._process_event(self._event_patterns, True, None)

    def _event_handler_0(self, p, _timestamp, _source):
        self.proposal.add(p)
        if self.active:
            self.spawn(Commander, [self._id, self.acceptors, self.replicas, (self.ballot_num, p), self.quorum, 0])
            self.output('Commander spawned')

    def _event_handler_1(self, ballot_num_, pvals, subset, _timestamp, _source):
        if (ballot_num_ == self.ballot_num):
            self.output('Adopted started')
            if (len(self.pmax(pvals)) == 0):
                self.output('Fast round commander')
                self.spawn(Commander, [self._id, self.acceptors, self.replicas, (self.ballot_num, ((-1), (-1), (-1))), self.quorum, 1])
            elif (len(self.pmax(pvals)) == 1):
                self.output('Single value in figure 2')
                (a, p) = self.pmax(pvals).pop()
                self.spawn(Commander, [self._id, self.acceptors, self.replicas, (self.ballot_num, p), self.quorum, 0])
            else:
                p = self.observation4(pvals, subset)
                if (len(p) > 0):
                    p = p.pop()
                    self.output('Observation 4 satisfied')
                    self.spawn(Commander, [self._id, self.acceptors, self.replicas, (self.ballot_num, p), self.quorum, 0])
                else:
                    p = self.proposal.pop()
                    self.output('Collision recovery')
                    self.spawn(Commander, [self._id, self.acceptors, self.replicas, (self.ballot_num, p), self.quorum, 0])
            self.active = True
            self.output('Adopted Done')

    def _event_handler_2(self, b, round_type, _timestamp, _source):
        (r1, lam1) = b
        if ((b > self.ballot_num) or (round_type == 1)):
            self.active = False
            self.ballot_num = ((r1 + 1), self._id)
            self.spawn(Scout, [self._id, self.acceptors, self.ballot_num, self.quorum, 0])
            self.output('Preempted done')

    def observation4(self, pvals, subset):
        p_set = self.pmax(pvals)
        value1 = {p for (a, b, p) in pvals if (a == subset[0])}
        value2 = {p for (a, b, p) in pvals if (a == subset[1])}
        if (value1 == value2):
            return value1
        else:
            return list()

    def pmax(self, pvals):
        return {(a, p) for (a, b, p) in pvals if all(((b1 <= b) for (a, b1, p1) in pvals))}

    def form_quorum(self, acceptors):
        self.quorum = list()
        acceptors_copy = copy.deepcopy(acceptors)
        common_element = acceptors_copy.pop()
        while (len(acceptors_copy) > 0):
            self.quorum.append([common_element, 
            acceptors_copy.pop()])
        return self.quorum


class Commander(DistProcess):

    def __init__(self, parent, initq, channel, log):
        DistProcess.__init__(self, parent, initq, channel, log)
        self._event_patterns = [EventPattern(Event.receive, 'P2b', [], [(1, 'a'), (2, 'b1'), (3, 'p')], [self._event_handler_0])]
        self._sent_patterns = []
        self._label_events = {}

    def setup(self, lam, acceptors, replicas, load, quorum, round_type):
        (self.b, self.p) = load
        self.done = False
        self.quorum_done = list()
        self.accepted = set()
        for i in range(0, len(quorum)):
            self.quorum_done.append(
            list())
            for j in range(0, 2):
                self.quorum_done[i].append(0)
        self.load = load
        self.acceptors = acceptors
        self.quorum = quorum
        self.round_type = round_type
        self.lam = lam
        self.replicas = replicas

    def main(self):
        if self.round_type:
            self.output('Sending P2 any')
            self.send(('Any', self._id, self.b), self.acceptors)
        else:
            self.output('Sending regular P2a')
            self.send(('P2a', self._id, (self.b, self.p)), self.acceptors)
        while (not self.done):
            self._process_event(self._event_patterns, True, None)

    def _event_handler_0(self, a, b1, p, _timestamp, _source):
        if (b1 == self.b):
            self.accepted.add((a, p))
            subset = self.quorum_replied(a)
            if (len(subset) > 0):
                value1 = {p for (a, self.p) in self.accepted if (a == subset[0])}
                value2 = {p for (a, self.p) in self.accepted if (a == subset[1])}
                if (value1 == value2):
                    self.p = value1.pop()
                    self.output('Decision sent')
                    self.send(('Decision', p), self.replicas)
                else:
                    (r, l) = ballot_num
                    ballot_num = ((r + 1), l)
                    self.spawn(Scout, [self._id, self.acceptors, ballot_num, self.quorum, 0])
                self.done = True
            self.output('Decision might be sent')
        else:
            self.send(('Preempted', b1, self.round_type), self.lam)
            self.done = True
            self.output('Preempted')

    def quorum_replied(self, a):
        for i in range(0, len(self.quorum)):
            for j in range(0, 2):
                if (self.quorum[i][j] == a):
                    self.quorum_done[i][j] = 1
        for i in range(0, len(self.quorum)):
            if (self.quorum_done[i][0] and self.quorum_done[i][1]):
                return self.quorum[i]
        return list()


class Scout(DistProcess):

    def __init__(self, parent, initq, channel, log):
        DistProcess.__init__(self, parent, initq, channel, log)
        self._event_patterns = [EventPattern(Event.receive, 'P1b', [], [(1, 'a'), (2, 'b1'), (3, 'r')], [self._event_handler_0])]
        self._sent_patterns = []
        self._label_events = {}

    def setup(self, lam, acceptors, b, quorum, round_type):
        self.pvalues = set()
        self.done = False
        self.quorum_done = list()
        for i in range(0, len(quorum)):
            self.quorum_done.append(
            list())
            for j in range(0, 2):
                self.quorum_done[i].append(0)
        self.b = b
        self.round_type = round_type
        self.lam = lam
        self.acceptors = acceptors
        self.quorum = quorum

    def main(self):
        import time
        import random
        time.sleep(
        random.random())
        self.send(('P1a', self._id, self.b), self.acceptors)
        self.output('P1a sent')
        while (not self.done):
            self._process_event(self._event_patterns, True, None)

    def _event_handler_0(self, a, b1, r, _timestamp, _source):
        if (b1 == self.b):
            self.pvalues.update(r)
            subset = self.quorum_replied(a)
            if (len(subset) > 0):
                self.send(('Adopted', self.b, self.pvalues, subset), self.lam)
                self.done = True
                self.output('Adopted sent')
        else:
            self.send(('Preempted', b1, 0), self.lam)
            self.done = True
            self.output('preempted sent')

    def quorum_replied(self, a):
        for i in range(0, len(self.quorum)):
            for j in range(0, 2):
                if (self.quorum[i][j] == a):
                    self.quorum_done[i][j] = 1
        for i in range(0, len(self.quorum)):
            if (self.quorum_done[i][0] and self.quorum_done[i][1]):
                return self.quorum[i]
        return list()


class Client(DistProcess):

    def __init__(self, parent, initq, channel, log):
        DistProcess.__init__(self, parent, initq, channel, log)
        self._event_patterns = [EventPattern(Event.receive, 'Response', [], [(1, 'cid'), (2, 'result')], [self._event_handler_0])]
        self._sent_patterns = []
        self._label_events = {}

    def setup(self, replicas):
        self.cid = 0
        self.results = dict()
        self.count = dict()
        self.replicas = replicas

    def main(self):
        self.send(('Request', (self._id, self.cid, 
        randint(0, (NOPS - 1)))), self.replicas)
        while (not ((self.results.get(self.cid) != None) and (self.count.get(self.cid) == len(self.replicas)))):
            self._process_event(self._event_patterns, True, None)
        self.output(('Received result %d:%d' % (self.cid, self.results[self.cid])))

    def _event_handler_0(self, cid, result, _timestamp, _source):
        if (self.results.get(cid) == None):
            self.results[cid] = result
            self.count[cid] = 1
        elif (self.results[cid] != result):
            self.output(('Replicas out of sync at cid(%d) : %d - %d ' % (cid, self.results[cid], result)))
        else:
            self.count[cid]+=1

def main():
    nacceptors = 5
    nreplicas = 5
    nleaders = 3
    nclients = 5
    nops = 5
    use_channel('tcp')
    acceptors = createprocs(Acceptor, nacceptors, [])
    replicas = createprocs(Replica, nreplicas)
    leaders = createprocs(Leader, nleaders, (acceptors, replicas))
    clients = createprocs(Client, nclients, (replicas,))
    setupprocs(replicas, (leaders, acceptors, 0))
    startprocs(acceptors)
    startprocs((replicas | leaders))
    startprocs(clients)
    for p in (((acceptors | replicas) | leaders) | clients):
        p.join()