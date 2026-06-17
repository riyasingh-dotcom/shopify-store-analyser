#!/bin/sh
set -e

# Only push schema for local databases (Docker db service or localhost).
# Cloud databases (Supabase, Neon, etc.) should have migrations applied via: pnpm db:push
if echo "$DATABASE_URL" | grep -qE '@db:|@localhost:'; then
  echo "Pushing Prisma schema to local database..."
  npx prisma db push --accept-data-loss
else
  echo "Skipping db push — cloud database detected."
fi

echo "Starting Next.js application..."
exec node server.js
