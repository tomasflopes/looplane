#!/bin/sh
# Vercel build: migrate, seed and sync the challenge catalogue, then build.
#
# Only PRODUCTION deploys touch the database. Preview deployments (every pull
# request) would otherwise run migrations and reset the admin password against
# whatever database their environment points at, usually the real one.
set -e
if [ "$VERCEL_ENV" = "production" ] || [ -z "$VERCEL_ENV" ]; then
  pnpm exec prisma migrate deploy
  pnpm run db:seed
  pnpm run challenges:sync
else
  echo "VERCEL_ENV=$VERCEL_ENV: skipping database steps."
fi
exec pnpm exec next build
