#!/bin/sh
set -e

echo "🚀 Starting Hearth application..."
echo "⏳ Waiting a few seconds for database to be ready..."
sleep 5

# Run database migrations (this will wait/retry if DB isn't ready)
echo "🔄 Running database migrations..."
if npx prisma migrate deploy; then
  echo "✅ Database migrations completed successfully"
else
  echo "⚠️  Migration failed - will retry in 10 seconds..."
  sleep 10
  if npx prisma migrate deploy; then
    echo "✅ Database migrations completed successfully (retry)"
  else
    echo "❌ Database migrations failed after retry"
    echo "⚠️  Starting application anyway - migrations may need manual intervention"
  fi
fi

echo "🎉 Starting Next.js application..."

# Start the Next.js server
exec "$@"
