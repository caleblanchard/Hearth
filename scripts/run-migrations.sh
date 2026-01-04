#!/bin/sh
# Helper script to run database migrations manually
# Usage: docker exec <container-name> /app/scripts/run-migrations.sh

set -e

echo "🔄 Running database migrations..."

if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set!"
  exit 1
fi

export DATABASE_URL

# Try migrate deploy first
if npx prisma migrate deploy; then
  echo "✅ Database migrations completed successfully"
  exit 0
fi

echo "⚠️  migrate deploy failed, trying db push as fallback..."
if npx prisma db push --accept-data-loss --skip-generate; then
  echo "✅ Database schema pushed successfully"
  exit 0
fi

echo "❌ All migration attempts failed"
exit 1
