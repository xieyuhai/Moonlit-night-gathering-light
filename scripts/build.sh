#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI_BIN="${LAYAAIR_CLI:-$HOME/.layaair/layaair}"
if [[ ! -x "$CLI_BIN" ]]; then
  node "$PROJECT_DIR/scripts/build-preview.cjs"
else
  "$CLI_BIN" build web -p "$PROJECT_DIR"
fi
cp "$PROJECT_DIR/LICENSE.md" "$PROJECT_DIR/release/web/LICENSE.md"
