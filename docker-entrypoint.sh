#!/bin/sh
# Explicitly do NOT use set -e - we want to handle all errors gracefully
# and always reach the exec command at the end

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
MIGRATION_SUCCESS=false

if [ "$USE_DB_PUSH" = "true" ]; then
  echo "🔄 Pushing database schema (no migrations found)..."
  if npx prisma db push --accept-data-loss --skip-generate 2>&1; then
    echo "✅ Database schema pushed successfully"
    MIGRATION_SUCCESS=true
  else
    echo "❌ Schema push failed (see output above)"
    MIGRATION_SUCCESS=false
  fi
else
  echo "🔄 Running database migrations..."
  echo "Using DATABASE_URL: ${DATABASE_URL%%@*}" # Show only the protocol part for security
  
  # Test database connectivity first
  echo "🔍 Testing database connectivity..."
  echo "SELECT 1;" | npx prisma db execute --stdin > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "✅ Database is reachable"
  else
    echo "⚠️  Warning: Could not connect to database, but continuing anyway..."
  fi
  
  # Try migrate deploy with explicit error handling - run directly to see output in real-time
  echo "📦 Running: npx prisma migrate deploy"
  echo "   (This may take a moment...)"
  
  # Run migration - always continue even if it fails
  echo "📦 Executing: npx prisma migrate deploy"
  npx prisma migrate deploy 2>&1
  MIGRATE_EXIT_CODE=$?
  
  if [ $MIGRATE_EXIT_CODE -eq 0 ]; then
    echo "✅ Database migrations completed successfully"
    MIGRATION_SUCCESS=true
  else
    echo "⚠️  Migration failed with exit code: $MIGRATE_EXIT_CODE"
    echo "⚠️  Will retry in 10 seconds..."
    sleep 10
    
    echo "📦 Retrying: npx prisma migrate deploy"
    npx prisma migrate deploy 2>&1
    MIGRATE_EXIT_CODE=$?
    
    if [ $MIGRATE_EXIT_CODE -eq 0 ]; then
      echo "✅ Database migrations completed successfully (retry)"
      MIGRATION_SUCCESS=true
    else
      echo "❌ Database migrations failed after retry (exit code: $MIGRATE_EXIT_CODE)"
      echo ""
      echo "⚠️  Attempting to push schema directly as fallback..."
      npx prisma db push --accept-data-loss --skip-generate 2>&1
      PUSH_EXIT_CODE=$?
      
      if [ $PUSH_EXIT_CODE -eq 0 ]; then
        echo "✅ Database schema pushed successfully (fallback method)"
        MIGRATION_SUCCESS=true
      else
        echo "❌ Schema push also failed (exit code: $PUSH_EXIT_CODE)"
        echo ""
        echo "⚠️  Starting application anyway - migrations may need manual intervention"
        echo "⚠️  You may need to run: docker exec <container> npx prisma migrate deploy"
        MIGRATION_SUCCESS=false
      fi
    fi
  fi
fi

# Verify that at least the system_config table exists (basic sanity check)
echo "🔍 Verifying database setup..."
echo "SELECT 1 FROM system_config LIMIT 1;" | npx prisma db execute --stdin > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Database tables verified"
else
  echo "⚠️  Warning: Could not verify database tables"
  if [ "$MIGRATION_SUCCESS" = "false" ]; then
    echo "⚠️  Migrations did not complete successfully - database may not be ready"
  fi
fi

echo "🎉 Starting Next.js application..."
echo "   Command: $@"
echo "   Working directory: $(pwd)"
echo "   Prisma migrations status: $MIGRATION_SUCCESS"

# Always start the application, even if migrations failed
# This allows the container to run so you can debug the issue
# Use exec to replace the shell process with the application
echo "🚀 Executing application command..."
exec "$@"
