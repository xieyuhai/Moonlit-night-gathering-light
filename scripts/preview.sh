#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PREVIEW_PORT="${PORT:-8765}"
if [[ ! -f "$PROJECT_DIR/release/web/index.html" ]]; then
  "$PROJECT_DIR/scripts/build.sh"
fi
echo "打开 http://127.0.0.1:$PREVIEW_PORT/"
python3 -m http.server "$PREVIEW_PORT" --bind 127.0.0.1 --directory "$PROJECT_DIR/release/web"
