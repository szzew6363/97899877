#!/usr/bin/env bash
# ============================================================
# Migration Runner
# Usage:
#   ./migrations/run.sh up          — Apply all pending migrations
#   ./migrations/run.sh down <N>    — Rollback migration N
#   ./migrations/run.sh status      — Show applied migrations
# ============================================================
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set."
  exit 1
fi

MIGRATIONS_DIR="$(cd "$(dirname "$0")" && pwd)"
PSQL="psql $DATABASE_URL --no-psqlrc -v ON_ERROR_STOP=1"

# Create tracking table
$PSQL -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checksum    TEXT
);"

case "${1:-up}" in
  up)
    echo "▶ Applying migrations..."
    for file in "$MIGRATIONS_DIR"/[0-9]*.sql; do
      # Skip rollback files
      [[ "$file" == *.down.sql ]] && continue
      version=$(basename "$file" .sql)
      if $PSQL -tAc "SELECT 1 FROM schema_migrations WHERE version='$version'" | grep -q 1; then
        echo "  ✓ $version (already applied)"
      else
        echo "  → Applying $version..."
        $PSQL -f "$file"
        checksum=$(md5sum "$file" | cut -d' ' -f1)
        $PSQL -c "INSERT INTO schema_migrations(version, checksum) VALUES('$version','$checksum');"
        echo "  ✓ $version applied"
      fi
    done
    echo "✅ All migrations applied."
    ;;
  down)
    VERSION="${2:-}"
    if [ -z "$VERSION" ]; then
      echo "Usage: ./run.sh down <migration_version>"
      exit 1
    fi
    ROLLBACK="$MIGRATIONS_DIR/${VERSION}.down.sql"
    if [ ! -f "$ROLLBACK" ]; then
      echo "ERROR: Rollback file not found: $ROLLBACK"
      exit 1
    fi
    echo "⚠  Rolling back $VERSION..."
    $PSQL -f "$ROLLBACK"
    $PSQL -c "DELETE FROM schema_migrations WHERE version='$VERSION';"
    echo "✅ Rollback complete."
    ;;
  status)
    echo "Applied migrations:"
    $PSQL -c "SELECT version, applied_at FROM schema_migrations ORDER BY applied_at;"
    ;;
  *)
    echo "Unknown command: ${1}"
    echo "Usage: ./run.sh [up|down <version>|status]"
    exit 1
    ;;
esac
