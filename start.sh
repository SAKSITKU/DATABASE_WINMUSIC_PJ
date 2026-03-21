#!/bin/sh
# Start backend
node server.js &
# Serve frontend
serve -s public -l 80