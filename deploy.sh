#!/bin/bash
if [ $# -ne 1 ]; then
    echo "Please give a directory as an argument."
    exit 1
fi
if [ ! -d $1 ]; then
    echo "$1: No such directory"
    exit 1
fi

TARGET=$1
echo "Copying files to $TARGET..."
cp *.html *.css $TARGET
mkdir -p $TARGET/css
cp css/*.css $TARGET/css
mkdir -p $TARGET/js
cp js/*.js js/*.swf $TARGET/js
