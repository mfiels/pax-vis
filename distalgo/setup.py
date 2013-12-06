from distutils.core import setup

setup(name = "DistAlgo",
      version = "0.6b",
      author= "bolin",
      author_email = "bolin@cs.stonybrook.edu",
      packages = ['distalgo', 'distalgo.compiler', 'distalgo.runtime', 'pympler'],
      data_files=[('bin', ['bin/dac', 'bin/dar']),
                  ('examples', ['examples/ping.da'])])
