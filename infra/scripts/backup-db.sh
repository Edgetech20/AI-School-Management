#!/usr/bin/env bash
set -euo pipefail

HOST="${HOST:-localhost}"
PORT="${PORT:-3306}"
USER="${USER_NAME:-root}"
PASSWORD="${PASSWORD:-}"
DATABASE="${DATABASE:-attendance_db}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
ts="$(date +%Y%m%d_%H%M%S)"
out="$BACKUP_DIR/$DATABASE-$ts.sql"

if [ -z "$PASSWORD" ]; then
  mysqldump -h "$HOST" -P "$PORT" -u "$USER" "$DATABASE" > "$out"
else
  mysqldump -h "$HOST" -P "$PORT" -u "$USER" --password="$PASSWORD" "$DATABASE" > "$out"
fi

find "$BACKUP_DIR" -name "$DATABASE-*.sql" -type f -mtime +"$KEEP_DAYS" -delete

echo "Backup created: $out"
