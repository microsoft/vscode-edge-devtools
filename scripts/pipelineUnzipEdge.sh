#!/bin/bash
{
    unzip $1 src/out/Release/gen/devtools/* -d $2
    unzip $1 src/third_party/devtools-frontend/src/front_end/* -d $2
} || {
    unzip $1 */src/out/Release/gen/devtools/* -d $2
    unzip $1 */src/third_party/devtools-frontend/src/front_end/* -d $2
    mv $2/*/src $2/
    find $2/. -maxdepth 1 -type d -exec rmdir {} 2>/dev/null \;
}
