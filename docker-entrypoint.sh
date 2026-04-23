#!/bin/sh
set -eu

CONFIG_PATH="/usr/share/nginx/html/config.json"

cat > "$CONFIG_PATH" <<EOF
{
  "apiBaseUrl": "${VITE_API_BASE_URL:-http://localhost:8000}",
  "sseEnabled": ${VITE_SSE_ENABLED:-true},
  "ocrMaxFileMb": ${VITE_OCR_MAX_FILE_MB:-25},
  "batchSyncMax": ${VITE_BATCH_SYNC_MAX:-5},
  "defaultLocale": "${VITE_DEFAULT_LOCALE:-ru}",
  "buildVersion": "${VITE_BUILD_VERSION:-dev}"
}
EOF

exec "$@"
