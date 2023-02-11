#!/usr/bin/env python

import os
import re
import shutil

from fabricate import *

# Default is to minify everything and bundle into a big file for production.
js_files = [
    # We handle flashcanvas separately.
    {"name": "jquery.min.js",
     "minify": False,
     "CDN": "https://code.jquery.com/jquery-1.9.1.min.js"},
    {"name": "jquery.flot.js"},
    {"name": "jquery.flot.canvas.js"},
    {"name": "jquery.flot.crosshair.js"},
    {"name": "jquery.flot.axislabels.js"},
    {"name": "jstat.min.js",
     "minify": False},
    {"name": "sprintf-0.7-beta1.js"},
    {"name": "jquery.handsontable.full.js"},
    {"name": "es5-shim.min.js",
     "minify": False},
    {"name": "normalscore.js"}]

for file in js_files:
    file.setdefault("minify", True)
    file.setdefault("concat", not "CDN" in file)

def concat(files, output):
    destination = open(output, 'wb')
    for filename in files:
        shutil.copyfileobj(open(filename, 'rb'), destination)
    destination.close()

def script(x):
    return """<script type="text/javascript" src="%s"></script>\n""" % x

def get_script_tags():
    html = ""
    for file in js_files:
        if "CDN" in file:
            html += script(file["CDN"])
        elif not file["concat"]:
            html += script("js/" + file["name"]) # hmm might be minified but w/e
    html += script("js/normalscore-full.js")
    return html

def build_index():
    pat = re.compile(re.escape('<!--SCRIPTS_START-->') + '(.*)' + 
                     re.escape('<!--SCRIPTS_END-->'), re.DOTALL)
    
    html = open("index.html").read()
    open("prod.index.html", "w").write(pat.sub(get_script_tags(), html))

def build():
    for file in js_files:
        if file["minify"]:
            file["minname"] = re.sub("\.js$", ".mintmp.js", file["name"])
            run("yuicompressor", os.path.join("js", file["name"]),
                "-o", os.path.join("js", file["minname"]))
        else:
            file["minname"] = file["name"]

    files_to_concat = [os.path.join("js", file["minname"]) 
                       for file in js_files if file["concat"]]
    print("Concatenating...")
    concat(files_to_concat, os.path.join("js", "normalscore-full.js"))
    print("Building prod.index.html...")
    build_index()

main()
