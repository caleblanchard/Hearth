#!/bin/sh
set -e

echo "🚀 Starting Hearth application..."

# Debug: Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set!"
  echo "Please ensure you pass -e DATABASE_URL=... to docker run"
  exit 1
fi

echo "✅ Database URL configured"
echo "⏳ Waiting a few seconds for database to be ready..."
sleep 5

# Verify migrations directory exists
if [ ! -d "/app/prisma/migrations" ]; then
  echo "❌ ERROR: Migrations directory not found at /app/prisma/migrations"
  echo "Available files in /app/prisma:"
  ls -la /app/prisma/ || true
  echo ""
  echo "⚠️  Falling back to schema push instead of migrations..."
  USE_DB_PUSH=true
else
  echo "✅ Migrations directory found"
  echo "📋 Migration files:"
  ls -1 /app/prisma/migrations/ | grep -E "^[0-9]" | head -5 || echo "No migration directories found"
  USE_DB_PUSH=false
fi

# Export DATABASE_URL explicitly for Prisma (Prisma reads from env, not config file for migrations)
export DATABASE_URL

# Run database migrations (this will wait/retry if DB isn't ready)
if [ "$USE_DB_PUSH" = "true" ]; then
  echo "🔄 Pushing database schema (no migrations found)..."
  PUSH_OUTPUT=$(npx prisma db push --accept-data-loss --skip-generate 2>&1)
  PUSH_EXIT_CODE=$?
  
  if [ $PUSH_EXIT_CODE -eq 0 ]; then
    echo "✅ Database schema pushed successfully"
  else
    echo "❌ Schema push failed"
    echo "Push output:"
    echo "$PUSH_OUTPUT"
    exit 1
  fi
else
  echo "🔄 Running database migrations..."
  echo "Using DATABASE_URL: ${DATABASE_URL%%@*}" # Show only the protocol part for security
  
  # Try migrate deploy with explicit error handling
  MIGRATE_OUTPUT=$(npx prisma migrate deploy 2>&1)
  MIGRATE_EXIT_CODE=$?
  
  if [ $MIGRATE_EXIT_CODE -eq 0 ]; then
    echo "✅ Database migrations completed successfully"
  else
    echo "⚠️  Migration failed with exit code: $MIGRATE_EXIT_CODE"
    echo "Migration output:"
    echo "$MIGRATE_OUTPUT"
    echo ""
    echo "⚠️  Will retry in 10 seconds..."
    sleep 10
    
    MIGRATE_OUTPUT=$(npx prisma migrate deploy 2>&1)
    MIGRATE_EXIT_CODE=$?
    
    if [ $MIGRATE_EXIT_CODE -eq 0 ]; then
      echo "✅ Database migrations completed successfully (retry)"
    else
      echo "❌ Database migrations failed after retry"
      echo "Retry output:"
      echo "$MIGRATE_OUTPUT"
      echo ""
      echo "⚠️  Attempting to push schema directly as fallback..."
      PUSH_OUTPUT=$(npx prisma db push --accept-data-loss --skip-generate 2>&1)
      PUSH_EXIT_CODE=$?
      
      if [ $PUSH_EXIT_CODE -eq 0 ]; then
        echo "✅ Database schema pushed successfully (fallback method)"
      else
        echo "❌ Schema push also failed"
        echo "Push output:"
        echo "$PUSH_OUTPUT"
        echo ""
        echo "⚠️  Starting application anyway - migrations may need manual intervention"
        echo "⚠️  You may need to run: docker exec <container> npx prisma migrate deploy"
      fi
    fi
  fi
fi

# Verify that at least the system_config table exists (basic sanity check)
echo "🔍 Verifying database setup..."
if npx prisma db execute --stdin <<< "SELECT 1 FROM system_config LIMIT 1;" > /dev/null 2>&1; then
  echo "✅ Database tables verified"
else
  echo "⚠️  Warning: Could not verify database tables (this may be normal if using db push)"
fi

echo "🎉 Starting Next.js application..."

# Start the Next.js server
exec "$@"
