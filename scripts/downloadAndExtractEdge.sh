#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
output=$(node $DIR/retrieveDownloadLink.js win)
curl "$output" --output edge.zip
$DIR/unzipEdge.sh edge.zip "$1"
rm edge.zip