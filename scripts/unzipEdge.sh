#!/bin/bash
unzip "$1" src/out/Release/gen/devtools/* -d "$2"
unzip "$1" src/out/Release/gen/devtools/*/* -d "$2"
unzip "$1" src/third_party/devtools-frontend/src/front_end/*/* -d "$2"
unzip "$1" src/third_party/devtools-frontend/src/front_end/*/*/* -d "$2"