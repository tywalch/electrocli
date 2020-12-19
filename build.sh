#!/bin/sh
message=$1
if [ -z "$message" ]; then
    echo "No message supplied"
    exit 1
fi
tsc
git add *
node ./bump
git commit -m "$message"
git push
npm publish