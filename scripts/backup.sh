#!/usr/bin/env bash
# ============================================================
# Automated Daily Backup Script
# Cron: 0 2 * * * /workspace/scripts/backup.sh >> /var/log/mr7-backup.log 2>&1
# Restore test: 0 3 1 * * /workspace/scripts/restore-test.sh
# ============================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups/postgres}"
KEEP_DAYS="${KEEP_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/mr7ai_$TIMESTAMP.sql.gz"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[$(date)] ERROR: DATABASE_URL not set"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup → $BACKUP_FILE"
pg_dump "$DATABASE_URL" \
  --no-password \
  --format=plain \
  --no-owner \
  --no-acl \
  | gzip -9 > "$BACKUP_FILE"

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup complete — $SIZE"

# Remove backups older than KEEP_DAYS
REMOVED=$(find "$BACKUP_DIR" -name "mr7ai_*.sql.gz" -mtime "+$KEEP_DAYS" -print -delete | wc -l)
echo "[$(date)] Removed $REMOVED old backup(s) (older than $KEEP_DAYS days)"

echo "[$(date)] ✅ Backup successful: $BACKUP_FILE"
