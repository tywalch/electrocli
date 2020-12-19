#!/bin/sh
message=$1
if [ -z "$message" ]; then
    echo "No message supplied"
    exit 1
fi
tsc
node ./bump
git add *
git commit -m "$message"
git push
npm publish