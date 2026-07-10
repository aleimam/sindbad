#!/usr/bin/env bash
# Nightly Postgres backup — run on the VPS (cron). Dumps the DB via the running
# container (reading its own credentials), gzips it, and prunes dumps older than
# RETAIN_DAYS. Copy these off-box periodically (see docs/06-deployment.md).
set -euo pipefail

cd "$(dirname "$0")/.."
BACKUP_DIR="/opt/sindbad/backups"
RETAIN_DAYS="${RETAIN_DAYS:-14}"
COMPOSE="docker compose -f docker-compose.prod.yml"

mkdir -p "$BACKUP_DIR"
TS="$(date +%F_%H%M)"
OUT="$BACKUP_DIR/db-$TS.sql.gz"

$COMPOSE exec -T postgres \
  sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  | gzip > "$OUT"

# Guard against a truncated/empty dump.
if [ "$(gzip -dc "$OUT" | head -c 200 | wc -c)" -lt 50 ]; then
  echo "ERROR: dump looks empty — removing $OUT" >&2
  rm -f "$OUT"
  exit 1
fi

find "$BACKUP_DIR" -name 'db-*.sql.gz' -mtime "+$RETAIN_DAYS" -delete
echo "$(date -u +%FT%TZ)  backup OK: $OUT ($(du -h "$OUT" | cut -f1))"
