#!/bin/sh
set -e

echo "🚀 Starting Hearth application..."

# Function to wait for database to be ready
wait_for_db() {
  echo "⏳ Waiting for database to be ready..."

  max_attempts=30
  attempt=0

  while [ $attempt -lt $max_attempts ]; do
    if npx prisma db execute --stdin <<< "SELECT 1;" >/dev/null 2>&1; then
      echo "✅ Database is ready!"
      return 0
    fi

    attempt=$((attempt + 1))
    echo "   Attempt $attempt/$max_attempts - Database not ready yet..."
    sleep 2
  done

  echo "❌ Database did not become ready in time"
  return 1
}

# Wait for database connection
if ! wait_for_db; then
  echo "⚠️  Proceeding without database connection verification"
fi

# Run database migrations
echo "🔄 Running database migrations..."
if npx prisma migrate deploy; then
  echo "✅ Database migrations completed successfully"
else
  echo "❌ Database migrations failed"
  exit 1
fi

# Optional: Generate Prisma Client (in case it's needed)
# echo "🔧 Generating Prisma Client..."
# npx prisma generate

echo "🎉 Starting Next.js application..."

# Start the Next.js server
exec "$@"
