#!/bin/sh
set -e

# Writes the API URL the browser will call, from the API_URL environment
# variable (RULES.md R-16). Defaults to the relative /api path, proxied to
# the API container by this same nginx (nginx.conf) — same-origin from the
# browser's point of view no matter what host/IP was used to reach the
# page (LAN, Tailscale, ...), so the session cookie's SameSite=Lax always
# sees a same-site request. A hardcoded LAN IP here broke exactly that for
# any access path other than the LAN (2026-09-17).
echo "window.__API_URL__ = \"${API_URL:-/api}\";" \
  > /usr/share/nginx/html/config.js
