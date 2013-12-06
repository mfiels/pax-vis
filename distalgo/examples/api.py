import socket
import json
import time

connection = None
is_open = False

def connect_as_algorithm(name, acceptors, replicas, leaders, clients):
  base = dict()
  base['configuration'] = dict()
  base['configuration']['acceptors'] = acceptors
  base['configuration']['replicas'] = replicas
  base['configuration']['leaders'] = leaders
  base['configuration']['clients'] = clients
  __connect__('algorithm', name, base)

def connect_as_application(name, *interests):
  base = dict()
  base['interests'] = interests
  __connect__('application', name, base)

def open():
  try:
    global connection, is_open
    connection = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    connection.connect(('localhost', 9000))
    is_open = True
  except:
    print('Error connecting to API')

def __connect__(type, name, base):
  message = base
  message['action'] = 'Connect'
  message['type'] = type
  message['name'] = name
  __send__(message)

def request(algorithm, id, cid, value):
  message = dict()
  message['action'] = 'Request'
  message['algorithm'] = algorithm
  message['id'] = id
  message['cid'] = cid
  message['value'] = value

  __send__(message)

def response(id, cid, value):
  message = dict()
  message['action'] = 'Response'
  message['id'] = id
  message['cid'] = cid
  message['value'] = value

  __send__(message)

def send_inc(base):
  __send__(base)

def send_spawn(parent, child, name):
  base = dict()
  base['action'] = 'Spawn'
  base['parent'] = parent
  base['child'] = child
  base['name'] = name
  __send__(base)

def send_term(id,  name):
  base = dict()
  base['action'] = 'Terminate'
  base['id'] = id
  base['name'] = name
  __send__(base)

def send_slot(id, slot, value):
  base = dict()
  base['action'] = 'Slot'
  base['slot'] = slot
  base['value'] = value
  base['id'] = id
  __send__(base)

def __send__(base):
  try:
    if not is_open:
      return
    base['time'] = time.time() * 1000.0
    json_str = json.dumps(base) + '\r\n'
    connection.send(json_str.encode('ascii'))
  except:
    print('Error sending to API')

def wait_for_request():
  return __recv__('Request')

def wait_for_response():
  return __recv__('Response')

def __recv__(type):
  try:
    global connection
    while True:
      message = json.loads(connection.recv(4096).decode('ascii'))
      if message['action'] == type:
        return message
  except:
    print('Error receiving from API')


def disconnect():
  try:
    global connection
    connection.close()
    connection = None
  except:
    print('Error disconnecting from API')
