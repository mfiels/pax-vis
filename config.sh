#! /bin/bash

echo 'Configuring the bridge...'
cd bridge
npm instal
cd ..

echo 'Configuring the visualizer backend...'
cd vis
npm install
cd ..

