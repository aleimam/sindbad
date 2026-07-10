#!/usr/bin/env bash
# Sindbad deploy — run on the VPS from the repo root (/opt/sindbad).
# Pulls main, rebuilds the stack, applies migrations (via the migrate one-shot),
# and prunes dangling images. Idempotent; safe to re-run.
set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env"

echo "→ Fetching latest main…"
git fetch --all --prune
git reset --hard origin/main

echo "→ Building images…"
$COMPOSE build

# Apply migrations + seed as an explicit step BEFORE (re)starting services.
# `up -d` alone does NOT re-run an already-exited one-shot, so pending migrations
# would silently not apply on re-deploys — `run --rm` guarantees a fresh run.
echo "→ Applying database migrations + seed…"
$COMPOSE run --rm migrate

echo "→ Starting / refreshing services…"
$COMPOSE up -d

echo "→ Waiting for the API to report healthy…"
for i in $(seq 1 30); do
  if curl -fsS "https://${API_DOMAIN:-api.sindbad.app}/api/health" >/dev/null 2>&1; then
    echo "  API healthy."
    break
  fi
  sleep 2
done

echo "→ Pruning dangling images…"
docker image prune -f

echo "✓ Deploy complete."
$COMPOSE ps
