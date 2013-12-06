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
from examples.visproc import VisualizedDistProcess
import examples.api as api
NOPS = 3
lease_timeout = 2

def make_operation_lambda(i):
    return lambda state: ((state + i), (state + i))
operations = {i: make_operation_lambda(i) for i in range(NOPS)}


class Replica(VisualizedDistProcess):

    def __init__(self, parent, initq, channel, log):
        VisualizedDistProcess.__init__(self, parent, initq, channel, log)
        self._event_patterns = [EventPattern(Event.receive, 'Request', [], [(1, 'p')], [self._event_handler_0]), EventPattern(Event.receive, 'ReadRequest', [], [(1, 'p')], [self._event_handler_1]), EventPattern(Event.receive, 'Decision', [], [(1, 's'), (2, 'p'), (3, 'lam')], [self._event_handler_2]), EventPattern(Event.receive, 'ReadDecision', [], [(1, 'p')], [self._event_handler_3])]
        self._sent_patterns = []
        self._label_events = {}

    def setup(self, leaders, initial_state):
        (self.state, self.slot_num) = (initial_state, 1)
        (self.proposals, self.decisions) = (set(), set())
        self.initial_state = initial_state
        self.leaders = leaders

    def main(self):
        while (not False):
            self._process_event(self._event_patterns, True, None)

    def propose(self, p):
        if (not {s for (s, p1) in self.decisions if (p1 == p)}):
            maxs = max((({0} | set((s for (s, p1) in self.proposals))) | set((s for (s, p1) in self.decisions))))
            s1 = min((s for s in range(1, ((maxs + 1) + 1)) if (not (set((p1 for (s0, p1) in self.proposals if (s0 == s))) | set((p1 for (s0, p1) in self.decisions if (s0 == s)))))))
            self.proposals.add((s1, p))
            self.send(('Propose', s1, p), self.leaders)

    def perform(self, p):
        (k, cid, op) = p
        if {s for (s, p0) in self.decisions if ((p0 == p) and (s < self.slot_num))}:
            self.slot_num+=1
        else:
            self.output(('Decided on: ops[%d] = %d' % (self.slot_num, op)))
            api.send_slot(self._id._address[1], self.slot_num, op)
            (next, result) = operations[op](self.state)
            (self.state, self.slot_num) = (next, (self.slot_num + 1))
            self.send(('Response', cid, result), k)

    def _event_handler_0(self, p, _timestamp, _source):
        self.propose(p)

    def _event_handler_1(self, p, _timestamp, _source):
        self.send(('Propose', (-2), p), self.leaders)

    def _event_handler_2(self, s, p, lam, _timestamp, _source):
        self.decisions.add((s, p))
        self.send(('AckDecision', s), lam)
        while {p1 for (s0, p1) in self.decisions if (s0 == self.slot_num)}:
            p1 = {p1 for (s0, p1) in self.decisions if (s0 == self.slot_num)}.pop()
            for p2 in {p2 for (s0, p2) in self.proposals if (s0 == self.slot_num) if (p2 != p1)}:
                self.propose(p2)
            self.perform(p1)

    def _event_handler_3(self, p, _timestamp, _source):
        self.output('OnReadDecision')
        (k, cid, op) = p
        self.send(('Response', cid, cid), k)


class Acceptor(VisualizedDistProcess):

    def __init__(self, parent, initq, channel, log):
        VisualizedDistProcess.__init__(self, parent, initq, channel, log)
        self._event_patterns = [EventPattern(Event.receive, 'P1a', [], [(1, 'lam'), (2, 'b'), (3, 'min_slot')], [self._event_handler_0]), EventPattern(Event.receive, 'P2a', [], [(1, 'lam'), (2, 'load')], [self._event_handler_1])]
        self._sent_patterns = []
        self._label_events = {}

    def setup(self):
        self.ballot_num = ((-1), (-1))
        self.accepted_mod = set()
        self.accepted_tmp = set()
        self.selected_lam = 0
        self.blockP1a = False

    def main(self):
        while (not False):
            self._process_event(self._event_patterns, True, None)

    def _event_handler_0(self, lam, b, min_slot, _timestamp, _source):
        if self.blockP1a:
            return 
        if (b > self.ballot_num):
            self.ballot_num = b
            self.selected_lam = lam
        if (min_slot == (-2)):
            self.blockP1a = True
            self.send(('P1b', self._id, self.ballot_num, self.selected_lam, self.accepted_mod), lam)
            time.sleep(lease_timeout)
            self.blockP1a = False
        else:
            self.accepted_tmp = self.accepted_mod
            for (b, s, p) in [(b1, s1, p1) for (b1, s1, p1) in self.accepted_tmp if (s1 < min_slot)]:
                self.accepted_mod.remove((b, s, p))
            self.send(('P1b', self._id, self.ballot_num, self.selected_lam, self.accepted_mod), lam)

    def _event_handler_1(self, lam, load, _timestamp, _source):
        if self.blockP1a:
            return 
        (b, s, p) = load
        if (b >= self.ballot_num):
            self.ballot_num = b
            self.selected_lam = lam
            self.accepted_mod.add((b, s, p))
        self.send(('P2b', self._id, self.ballot_num, self.selected_lam), lam)


class Leader(VisualizedDistProcess):

    def __init__(self, parent, initq, channel, log):
        VisualizedDistProcess.__init__(self, parent, initq, channel, log)
        self._event_patterns = [EventPattern(Event.receive, 'Propose', [], [(1, 's'), (2, 'p')], [self._event_handler_0]), EventPattern(Event.receive, 'Adopted', [], [(1, 'ballot_num_'), (2, 'pvals')], [self._event_handler_1]), EventPattern(Event.receive, 'Preempted', [], [(1, 'b'), (2, 'lamb')], [self._event_handler_2]), EventPattern(Event.receive, 'AckDecision', [], [(1, 's')], [self._event_handler_3]), EventPattern(Event.receive, 'Query', [], [(1, 'source')], [self._event_handler_4]), EventPattern(Event.receive, 'Response', [], [(1, 'lamb_active')], [self._event_handler_5])]
        self._sent_patterns = []
        self._label_events = {}

    def setup(self, acceptors, replicas):
        self.ballot_num = (0, self._id)
        self.active = False
        self.lamb_active_local = True
        self.proposals = set()
        self.undecidedslot = set()
        self.Readp = (0, 0, 0)
        self.ROFlag = False
        self.replicas = replicas
        self.acceptors = acceptors

    def main(self):
        if (len(self.undecidedslot) == 0):
            min_slot_ = 0
        else:
            min_slot_ = min(self.undecidedslot)
        self.spawn(Scout, [self._id, self.acceptors, self.ballot_num, min_slot_])
        while (not False):
            self._process_event(self._event_patterns, True, None)

    def _event_handler_0(self, s, p, _timestamp, _source):
        if (s == (-2)):
            self.ROFlag = True
            self.Readp = p
            self.spawn(Scout, [self._id, self.acceptors, self.ballot_num, s])
        elif (not {p1 for (s1, p1) in self.proposals if (s1 == s)}):
            self.proposals.add((s, p))
            self.undecidedslot.add(s)
            if self.active:
                self.spawn(Commander, [self._id, self.acceptors, self.replicas, (self.ballot_num, s, p)])

    def _event_handler_1(self, ballot_num_, pvals, _timestamp, _source):
        if (ballot_num_ == self.ballot_num):
            if self.ROFlag:
                self.send(('ReadDecision', self.Readp), self.replicas)
                self.Readp = (0, 0, 0)
                self.ROFlag = False
                return 
            self.proposals = self.circle_plus(self.proposals, self.pmax(pvals))
            for (s, p) in self.proposals:
                if any((s1 for s1 in self.undecidedslot if (s1 == s))):
                    self.spawn(Commander, [self._id, self.acceptors, self.replicas, (self.ballot_num, s, p)])
            self.active = True

    def _event_handler_2(self, b, lamb, _timestamp, _source):
        (r1, lam1) = b
        if (b > self.ballot_num):
            self.active = False
            self.ballot_num = ((r1 + 1), self._id)
            self.waituntil(1, lamb)
            if (len(self.undecidedslot) == 0):
                min_slot_ = 0
            else:
                min_slot_ = min(self.undecidedslot)
            self.spawn(Scout, [self._id, self.acceptors, self.ballot_num, min_slot_])

    def _event_handler_3(self, s, _timestamp, _source):
        if any((s1 for s1 in self.undecidedslot if (s1 == s))):
            self.undecidedslot.remove(s)
        for (s, p) in [(s1, p1) for (s1, p1) in self.proposals if (s1 <= s)]:
            self.proposals.remove((s, p))

    def circle_plus(self, x, y):
        return (y | {(s, p) for (s, p) in x if (not {p1 for (s0, p1) in y if (s0 == s)})})

    def pmax(self, pvals):
        return {(s, p) for (b, s, p) in pvals if all(((b1 <= b) for (b1, s0, p1) in pvals if (s0 == s)))}

    def _event_handler_4(self, source, _timestamp, _source):
        self.send(('Response', self.active), source)

    def _event_handler_5(self, lamb_active, _timestamp, _source):
        self.lamb_active_local = lamb_active

    def waituntil(self, timeout, lamb_id):
        mustend = (time.time() + timeout)
        while (time.time() < mustend):
            self.send(('Query', self._id), lamb_id)
            if (self.lamb_active_local == False):
                self.lamb_active_local = True
                return True
        return False


class Commander(VisualizedDistProcess):

    def __init__(self, parent, initq, channel, log):
        VisualizedDistProcess.__init__(self, parent, initq, channel, log)
        self._event_patterns = [EventPattern(Event.receive, 'P2b', [], [(1, 'a'), (2, 'b1'), (3, 'lamb')], [self._event_handler_0])]
        self._sent_patterns = []
        self._label_events = {}

    def setup(self, lam, acceptors, replicas, load):
        self.waitfor = set(acceptors)
        (self.b, self.s, self.p) = load
        self.done = False
        self.replicas = replicas
        self.load = load
        self.lam = lam
        self.acceptors = acceptors

    def main(self):
        self.send(('P2a', self._id, (self.b, self.s, self.p)), self.acceptors)
        while (not self.done):
            self._process_event(self._event_patterns, True, None)

    def _event_handler_0(self, a, b1, lamb, _timestamp, _source):
        if (b1 == self.b):
            if (a in self.waitfor):
                self.waitfor.remove(a)
            if (len(self.waitfor) < (len(self.acceptors) / 2)):
                self.send(('Decision', self.s, self.p, self.lam), self.replicas)
                self.done = True
        else:
            self.send(('Preempted', b1, lamb), self.lam)
            self.done = True


class Scout(VisualizedDistProcess):

    def __init__(self, parent, initq, channel, log):
        VisualizedDistProcess.__init__(self, parent, initq, channel, log)
        self._event_patterns = [EventPattern(Event.receive, 'P1b', [], [(1, 'a'), (2, 'b1'), (3, 'lamb'), (4, 'r')], [self._event_handler_0])]
        self._sent_patterns = []
        self._label_events = {}

    def setup(self, lam, acceptors, b, min_slot):
        self.waitfor = set(acceptors)
        self.pvalues = set()
        self.done = False
        self.min_slot = min_slot
        self.b = b
        self.lam = lam
        self.acceptors = acceptors

    def main(self):
        import time
        import random
        time.sleep(
        random.random())
        self.send(('P1a', self._id, self.b, self.min_slot), self.acceptors)
        while (not self.done):
            self._process_event(self._event_patterns, True, None)

    def _event_handler_0(self, a, b1, lamb, r, _timestamp, _source):
        if (b1 == self.b):
            self.pvalues|=r
            if (a in self.waitfor):
                self.waitfor.remove(a)
            if (len(self.waitfor) < (len(self.acceptors) / 2)):
                self.send(('Adopted', self.b, self.pvalues), self.lam)
                self.done = True
        else:
            self.send(('Preempted', b1, lamb), self.lam)
            self.done = True


class Client(VisualizedDistProcess):

    def __init__(self, parent, initq, channel, log):
        VisualizedDistProcess.__init__(self, parent, initq, channel, log)
        self._event_patterns = [EventPattern(Event.receive, 'Response', [], [(1, 'cid'), (2, 'result')], [self._event_handler_0])]
        self._sent_patterns = []
        self._label_events = {}

    def setup(self, replicas):
        self.cid = 0
        self.results = dict()
        self.count = dict()
        self.replicas = replicas

    def main(self):
        while True:
            self.send(('Request', (self._id, self.cid, 
            randint(0, (NOPS - 1)))), self.replicas)
            while (not ((self.results.get(self.cid) != None) and (self.count.get(self.cid) == len(self.replicas)))):
                self._process_event(self._event_patterns, True, None)
            self.output(('Received result %d:%d' % (self.cid, self.results[self.cid])))
            self.cid+=1

    def _event_handler_0(self, cid, result, _timestamp, _source):
        if (self.results.get(cid) == None):
            self.results[cid] = result
            self.count[cid] = 1
        elif (self.results[cid] != result):
            self.output(('Replicas out of sync at cid(%d) : %d - %d ' % (cid, self.results[cid], result)))
        else:
            self.count[cid]+=1

def api_hook_prepare():
    api.open()

def api_hook_init(acceptors, replicas, leaders, clients):
    acceptors = [a._address[1] for a in acceptors]
    replicas = [r._address[1] for r in replicas]
    leaders = [l._address[1] for l in leaders]
    clients = [c._address[1] for c in clients]
    api.connect_as_algorithm('vR Paxos', acceptors, replicas, leaders, clients)

def main():
    nacceptors = 3
    nreplicas = 3
    nleaders = 3
    nclients = 3
    use_channel('tcp')
    dist_source('examples', 'visproc.py')
    api_hook_prepare()
    acceptors = createprocs(Acceptor, nacceptors, [])
    replicas = createprocs(Replica, nreplicas)
    leaders = createprocs(Leader, nleaders, (acceptors, replicas))
    clients = createprocs(Client, nclients, (replicas,))
    setupprocs(replicas, (leaders, 0))
    api_hook_init(acceptors, replicas, leaders, clients)
    startprocs(acceptors)
    startprocs((replicas | leaders))
    startprocs(clients)
    for p in (((acceptors | replicas) | leaders) | clients):
        p.join()