#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

npm ci
npm run build:pages
npx --yes wrangler@4.141.0 pages deploy release/web \
  --project-name moonlit-night-gathering-light \
  --branch main
