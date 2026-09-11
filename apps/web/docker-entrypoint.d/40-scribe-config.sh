#!/bin/sh
set -e

# Writes the API URL the browser will call, from the API_URL environment
# variable (RULES.md R-16), so the image does not need rebuilding when
# the deployment's address changes.
echo "window.__API_URL__ = \"${API_URL:-http://localhost:3000}\";" \
  > /usr/share/nginx/html/config.js
