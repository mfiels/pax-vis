pax-vis
=======

Paxos visualizer for CSE 535 project

To run make sure you have the following dependencies installed:
* Python 3.3
* Node.js
* NPM

Install the appropriate node modules with
`./config.sh`

Now open 3 terminal windows.

Window 1 will run the network bridge:
`cd bridge; node app.js`

Window 2 will run the visualizer backend:
`cd vis; node app.js`

Now navigate your web browser (preferably Chrome) to the visualizer at localhost:8080

Finally window 3 will run the optimized paxos algorithm:
`cd distalgo; python3.3 -m distalgo.runtime examples/optpaxos.da`

You will see the visualizer render the Paxos nodes. To start playback click the white playhead in the bottom left.

