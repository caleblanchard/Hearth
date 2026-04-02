#!/bin/sh
# Explicitly do NOT use set -e - we want to handle all errors gracefully
# and always reach the exec command at the end

echo "🚀 Starting Hearth application..."
echo "🎉 Starting Next.js application..."
echo "   Command: $@"
echo "   Working directory: $(pwd)"
echo "🚀 Executing application command..."
exec "$@"
