#!/bin/bash
set -e

MODE="${1:-api}"

# ── Wait for PostgreSQL ────────────────────────────────────────
wait_for_postgres() {
  echo "Waiting for PostgreSQL at ${DATABASE_URL}..."
  until psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; do
    echo "PostgreSQL unavailable, retrying in 2s..."
    sleep 2
  done
  echo "PostgreSQL is ready."
}

# ── Wait for Redis ─────────────────────────────────────────────
wait_for_redis() {
  echo "Waiting for Redis at ${REDIS_URL}..."
  local host="${REDIS_URL#redis://}"
  host="${host%%/*}"
  host="${host%%:*}"
  local port="${REDIS_URL#*://*:}"
  port="${port%%/*}"
  port="${port:-6379}"
  until redis-cli -h "$host" -p "$port" ping > /dev/null 2>&1; do
    echo "Redis unavailable, retrying in 2s..."
    sleep 2
  done
  echo "Redis is ready."
}

# ── Run Alembic migrations ─────────────────────────────────────
run_migrations() {
  echo "Running Alembic migrations..."
  alembic upgrade head
  echo "Migrations complete."
}

# ── Mode: API server ───────────────────────────────────────────
if [ "$MODE" = "api" ]; then
  wait_for_postgres
  run_migrations
  exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port "${PORT:-8000}" \
    --workers "${UVICORN_WORKERS:-4}" \
    --limit-concurrency "${UVICORN_CONCURRENCY:-100}" \
    --log-level "${LOG_LEVEL:-info}"

# ── Mode: Celery worker ────────────────────────────────────────
elif [ "$MODE" = "worker" ]; then
  wait_for_postgres
  wait_for_redis
  exec celery -A app.celery_app worker \
    -l "${LOG_LEVEL:-info}" \
    --concurrency="${WORKER_COUNT:-8}" \
    --queues="${CELERY_QUEUES:-default,ocr}" \
    --max-tasks-per-child="${CELERY_MAX_TASKS:-1000}" \
    --max-memory-per-child="${CELERY_MAX_MEMORY:-500000}" \
    --without-heartbeat \
    --without-gossip \
    --without-mingle

# ── Mode: Celery beat ──────────────────────────────────────────
elif [ "$MODE" = "beat" ]; then
  wait_for_redis
  exec celery -A app.celery_app beat \
    -l "${LOG_LEVEL:-info}" \
    --pidfile=/tmp/celerybeat.pid \
    --schedule=/tmp/celerybeat-schedule

else
  echo "Unknown mode: $MODE (use: api, worker, beat)"
  exit 1
fi
