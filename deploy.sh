#!/bin/bash

set -e

TARGET=_site

echo "💁 Building project..."
python3 build.py

echo "💁 Copying files to $TARGET..."
rm -rf $TARGET
mkdir -p $TARGET
cp prod.index.html $TARGET/index.html
mkdir -p $TARGET/css
cp css/*.css $TARGET/css
mkdir -p $TARGET/js
cp js/*.js js/*.swf $TARGET/js
cp -rf about $TARGET

echo "💁 Uploading..."
rsync \
    --archive \
    --compress \
    --delete \
    --info=progress2 \
    _site/ \
    simon@skagedal.tech:normalscore
