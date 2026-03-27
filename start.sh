#!/usr/bin/env bash
# Library Portal — unified start script
# Usage:
#   ./start.sh          — start API + Site
#   ./start.sh api      — start API only
#   ./start.sh site     — start Site only
#   ./start.sh db       — start Prisma Studio only
#   ./start.sh all      — start API + Site + Prisma Studio

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$ROOT/api"
SITE_DIR="$ROOT/site"

trap 'echo ""; echo "Stopping all services..."; kill $(jobs -p) 2>/dev/null; exit 0' SIGINT SIGTERM

start_api() {
  echo "▶ Starting API on http://localhost:3000"
  cd "$API_DIR" && npm run dev &
}

start_site() {
  echo "▶ Starting Site on http://localhost:5173"
  cd "$SITE_DIR" && npm run dev &
}

start_db() {
  echo "▶ Starting Prisma Studio on http://localhost:5555"
  cd "$API_DIR" && npm run db:studio &
}

MODE="${1:-default}"

case "$MODE" in
  api)
    start_api
    ;;
  site)
    start_site
    ;;
  db)
    start_db
    ;;
  all)
    start_api
    start_site
    start_db
    ;;
  *)
    start_api
    start_site
    ;;
esac

echo ""
echo "Services started. Press Ctrl+C to stop all."
wait
