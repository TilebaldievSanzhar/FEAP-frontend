#!/bin/sh
set -eu

CONFIG_PATH="/usr/share/nginx/html/config.json"
NGINX_CONF="/etc/nginx/conf.d/default.conf"
NGINX_TEMPLATE="/etc/nginx/templates/default.conf.template"

# Where the browser should talk to. Default is "" → same-origin, which makes
# nginx proxy /api to the backend (see nginx.conf.template). Set
# VITE_API_BASE_URL to a full URL (e.g. http://localhost:8000) only if you want
# the browser to bypass nginx and hit the backend directly (requires CORS on
# the backend — usually not what you want).
API_BASE_URL="${VITE_API_BASE_URL:-}"

# Backend URL as seen from inside the frontend container. Used by nginx to
# proxy /api. Default points to a docker-compose service named "app".
API_UPSTREAM="${API_UPSTREAM:-http://app:8000}"

cat > "$CONFIG_PATH" <<EOF
{
  "apiBaseUrl": "${API_BASE_URL}",
  "sseEnabled": ${VITE_SSE_ENABLED:-true},
  "ocrMaxFileMb": ${VITE_OCR_MAX_FILE_MB:-25},
  "batchSyncMax": ${VITE_BATCH_SYNC_MAX:-5},
  "defaultLocale": "${VITE_DEFAULT_LOCALE:-ru}",
  "buildVersion": "${VITE_BUILD_VERSION:-dev}",
  "calcAnonDailyLimit": ${VITE_CALC_ANON_DAILY_LIMIT:-3}
}
EOF

# Render nginx.conf.template → default.conf with API_UPSTREAM substituted in.
if [ -f "$NGINX_TEMPLATE" ]; then
  export API_UPSTREAM
  envsubst '${API_UPSTREAM}' < "$NGINX_TEMPLATE" > "$NGINX_CONF"
fi

exec "$@"
