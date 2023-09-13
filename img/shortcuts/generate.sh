#!/usr/bin/env bash

for icon in $(ls *.svg); do
	inkscape "${icon}" -h 192 -w 192 -o "${icon%%.svg}-192.png";
	inkscape "${icon}" -h 144 -w 144 -o "${icon%%.svg}-144.png";
	inkscape "${icon}" -h 96 -w 96 -o "${icon%%.svg}-96.png";
	inkscape "${icon}" -h 72 -w 72 -o "${icon%%.svg}-72.png";
	inkscape "${icon}" -h 48 -w 48 -o "${icon%%.svg}-48.png";
	inkscape "${icon}" -h 36 -w 36 -o "${icon%%.svg}-36.png";
done
