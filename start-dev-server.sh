#!/usr/bin/env bash
# Kill all running dev servers + build caches, then start the Nuxt dev server.
# Usage:
#   ./start-dev-server.sh            # kill, clean, start
#   ./start-dev-server.sh --clean-only   # kill + clean, don't start
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"
PORT="${PORT:-3000}"

echo "→ Killing dev servers…"
# Anything listening on the dev port (nuxt dev default 3000)
lsof -ti "tcp:${PORT}" 2>/dev/null | xargs kill -9 2>/dev/null || true
# Stray nuxt/vite/nitro processes (this project or orphaned)
pkill -9 -f "nuxt dev" 2>/dev/null || true
pkill -9 -f "${PROJECT_DIR}.*(nuxt|vite|nitro)" 2>/dev/null || true

echo "→ Clearing caches…"
rm -rf .nuxt .output dist node_modules/.vite node_modules/.cache

if [[ "${1:-}" == "--clean-only" ]]; then
  echo "✓ Cleaned. Skipping server start (--clean-only)."
  exit 0
fi

echo "→ Starting dev server on port ${PORT}…"
exec pnpm dev
