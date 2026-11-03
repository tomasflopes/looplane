#!/bin/sh
# Container entrypoint: migrate, seed, sync challenge metadata, then serve.
# Every step is idempotent, so a restart is safe.
set -e

# PostgreSQL may still be starting. Retry, but not forever: a migration that
# can never apply must fail the container loudly instead of looping silently.
attempt=1
until pnpm run db:deploy; do
  if [ "$attempt" -ge 20 ]; then
    echo "Database migrations still failing after $attempt attempts; giving up." >&2
    exit 1
  fi
  echo "waiting for postgres (attempt $attempt)"
  attempt=$((attempt + 1))
  sleep 3
done

pnpm run db:seed
pnpm run challenges:sync
exec pnpm run start
