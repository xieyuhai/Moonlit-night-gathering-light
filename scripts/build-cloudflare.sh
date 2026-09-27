#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_SEED="$PROJECT_DIR/月夜拾光-Web"
WEB_OUTPUT="$PROJECT_DIR/release/web"

if [[ ! -f "$WEB_SEED/libs/laya.core.js" ]]; then
  echo "缺少已纳入版本控制的 LayaAir Web 运行库：$WEB_SEED/libs/laya.core.js" >&2
  exit 1
fi

mkdir -p "$WEB_OUTPUT"
cp -R "$WEB_SEED/." "$WEB_OUTPUT/"

"$PROJECT_DIR/scripts/build.sh"
node "$PROJECT_DIR/scripts/check-rules.cjs"

echo "Cloudflare Pages 构建目录：$WEB_OUTPUT"
