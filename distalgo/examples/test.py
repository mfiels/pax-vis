NOPS = 10 # Number of operations of the state machine

def make_operation_lambda(i):
  return lambda state: (state + i, state + i)

operations = {i: make_operation_lambda(i) for i in range(NOPS)}

for i in range(NOPS):
  print(operations[i](0))