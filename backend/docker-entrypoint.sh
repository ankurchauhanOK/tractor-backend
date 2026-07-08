#!/bin/bash
set -e

wait_for_postgres() {
  echo "Waiting for PostgreSQL at ${DATABASE_URL}..."
  until psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; do
    echo "PostgreSQL unavailable, retrying in 2s..."
    sleep 2
  done
  echo "PostgreSQL is ready."
}

run_migrations() {
  echo "Running Alembic migrations..."
  alembic upgrade head
  echo "Migrations complete."
}

wait_for_postgres
run_migrations

exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8000}" \
  --workers "${UVICORN_WORKERS:-4}" \
  --limit-concurrency "${UVICORN_CONCURRENCY:-100}" \
  --log-level "${LOG_LEVEL:-info}"
