#!/bin/sh
# Mission Control Entrypoint
#
# Reads mc-config.json from the shared volume to extract the gateway URL,
# then generates the nginx config dynamically to proxy API requests
# to the correct upstream (public gateway URL or Docker internal).
#
# This solves the Coolify network isolation issue: mission-control and
# openclaw may be on separate Docker networks, so we use the public URL.

set -e

MC_CONFIG="/mc-shared/mc-config.json"
NGINX_CONF="/etc/nginx/conf.d/default.conf"
NGINX_TEMPLATE="/etc/nginx/templates/default.conf.template"

# Default fallback: Docker internal
GATEWAY_UPSTREAM="http://openclaw:18789"
# Docker internal DNS resolver
RESOLVER="127.0.0.11 valid=10s ipv6=off"

# Read gateway URL from mc-config.json
if [ -f "$MC_CONFIG" ]; then
  # Extract gatewayUrl (public URL like https://claw2.claw.citadelis.eu)
  GATEWAY_URL=$(cat "$MC_CONFIG" | sed -n 's/.*"gatewayUrl"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')

  if [ -n "$GATEWAY_URL" ] && [ "$GATEWAY_URL" != "null" ]; then
    # Test if Docker internal DNS resolves (same network)
    if nslookup openclaw >/dev/null 2>&1; then
      echo "[entrypoint] Docker DNS resolves 'openclaw' — using internal proxy"
      GATEWAY_UPSTREAM="http://openclaw:18789"
      RESOLVER="127.0.0.11 valid=10s ipv6=off"
    else
      echo "[entrypoint] Docker DNS cannot resolve 'openclaw' — using public URL: $GATEWAY_URL"
      GATEWAY_UPSTREAM="$GATEWAY_URL"
      # Use public DNS for HTTPS upstream resolution
      RESOLVER="8.8.8.8 1.1.1.1 valid=30s ipv6=off"
    fi
  fi
else
  echo "[entrypoint] Warning: $MC_CONFIG not found, using default upstream"
fi

echo "[entrypoint] Gateway upstream: $GATEWAY_UPSTREAM"
echo "[entrypoint] DNS resolver: $RESOLVER"

# Generate nginx config from template
if [ -f "$NGINX_TEMPLATE" ]; then
  sed -e "s|__GATEWAY_UPSTREAM__|${GATEWAY_UPSTREAM}|g" \
      -e "s|__RESOLVER__|${RESOLVER}|g" \
      "$NGINX_TEMPLATE" > "$NGINX_CONF"
  echo "[entrypoint] Generated nginx config from template"
else
  echo "[entrypoint] Warning: No template found, using existing nginx.conf"
fi

echo "[entrypoint] Starting nginx..."
exec nginx -g "daemon off;"
