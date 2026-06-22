#!/usr/bin/env bash
# ============================================================
# Monthly Restore Test — Verifies backups are restorable
# Cron: 0 3 1 * * /workspace/scripts/restore-test.sh >> /var/log/mr7-restore-test.log 2>&1
# ============================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups/postgres}"
TEST_DB="${RESTORE_TEST_DB:-mr7ai_restore_test}"
REPORT_FILE="$BACKUP_DIR/restore_test_$(date +%Y%m).txt"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[$(date)] ERROR: DATABASE_URL not set"
  exit 1
fi

# Get latest backup
LATEST=$(ls -t "$BACKUP_DIR"/mr7ai_*.sql.gz 2>/dev/null | head -1)
if [ -z "$LATEST" ]; then
  echo "[$(date)] ERROR: No backups found in $BACKUP_DIR"
  exit 1
fi

echo "[$(date)] Testing restore from: $LATEST"

# Extract DB connection
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:/]*\).*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

export PGPASSWORD="$DB_PASS"

# Create test DB
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $TEST_DB;" 2>/dev/null || true
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $TEST_DB;"

# Restore
gunzip -c "$LATEST" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEST_DB" --quiet

# Verify core tables
RESULT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEST_DB" -tAc "
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users','subscriptions','conversations','messages','agent_runs','api_usage');
")

# Cleanup test DB
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $TEST_DB;" 2>/dev/null || true

if [ "$RESULT" -eq 6 ]; then
  echo "[$(date)] ✅ Restore test PASSED — 6/6 core tables verified" | tee "$REPORT_FILE"
else
  echo "[$(date)] ❌ Restore test FAILED — Only $RESULT/6 core tables found" | tee "$REPORT_FILE"
  exit 1
fi
