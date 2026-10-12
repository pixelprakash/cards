#!/usr/bin/env bash
# Subsets the self-hosted fonts to the glyphs the site uses (Basic Latin, Latin-1, common punctuation).
# Needs: pip install fonttools brotli. Source files are the full Latin variable fonts from fontsource
# (bricolage-grotesque-latin-standard-normal, newsreader-latin-wght-normal / -italic).
set -euo pipefail
U="U+0020-007E,U+00A0-00FF,U+2013-2014,U+2018-201D,U+2022,U+2026"
F="kern,liga,clig,calt,ccmp,locl,mark,mkmk"
for f in bricolage-latin newsreader-latin newsreader-latin-italic; do
  python3 -m fontTools.subset "src-fonts/$f.woff2" --unicodes="$U" --layout-features="$F" --flavor=woff2 --output-file="public/fonts/$f.woff2"
done
# Limit the weight axis to the range the CSS actually uses.
python3 -m fontTools.varLib.instancer public/fonts/bricolage-latin.woff2 wght=500:800 -o public/fonts/bricolage-latin.woff2
for f in newsreader-latin newsreader-latin-italic; do
  python3 -m fontTools.varLib.instancer "public/fonts/$f.woff2" wght=400:700 -o "public/fonts/$f.woff2"
done
