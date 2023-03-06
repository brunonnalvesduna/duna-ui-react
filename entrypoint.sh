#!/bin/sh
VITE_WS_URL=ws://$1:9090 /usr/local/bin/npm run build && /usr/local/bin/npm run preview # load VITE_WS_URL from host