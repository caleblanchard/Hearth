#!/bin/bash

# HouseholdERP Database Restore Script
#
# This script restores a backup of the PostgreSQL database
#
# Usage: ./scripts/restore.sh <backup-file>
# Example: ./scripts/restore.sh backups/backup_20250102_120000.sql.gz

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.prod.yml"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ Error: No backup file specified${NC}"
    echo "Usage: $0 <backup-file>"
    echo ""
    echo "Available backups:"
    find "$PROJECT_DIR/backups" -name "backup_*.sql.gz" -type f | sort -r | head -n 10
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${RED}⚠️  WARNING: Database Restore${NC}"
echo "This will REPLACE the current database with the backup:"
echo "   $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " -r
echo

if [[ ! $REPLY =~ ^yes$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

echo -e "${GREEN}🔄 Starting database restore...${NC}"
echo "Started at: $(date)"
echo ""

# Stop the application (keep database running)
echo -e "${YELLOW}📥 Stopping application...${NC}"
docker-compose -f "$COMPOSE_FILE" stop hearth-app

# Wait a moment for connections to close
sleep 3

# Drop existing connections and recreate database
echo -e "${YELLOW}🗑️  Preparing database...${NC}"
docker-compose -f "$COMPOSE_FILE" exec -T hearth-db psql -U hearth_user postgres <<-EOSQL
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = 'hearth_db'
      AND pid <> pg_backend_pid();

    DROP DATABASE IF EXISTS hearth_db;
    CREATE DATABASE hearth_db OWNER hearth_user;
EOSQL

# Restore the backup
echo -e "${YELLOW}📦 Restoring backup...${NC}"
if gunzip -c "$BACKUP_FILE" | docker-compose -f "$COMPOSE_FILE" exec -T hearth-db psql -U hearth_user hearth_db; then
    echo -e "${GREEN}✅ Database restored successfully${NC}"
else
    echo -e "${RED}❌ Restore failed${NC}"
    exit 1
fi

# Start the application
echo -e "${YELLOW}🚀 Starting application...${NC}"
docker-compose -f "$COMPOSE_FILE" up -d

# Wait for application to be ready
echo -e "${YELLOW}⏳ Waiting for application to start...${NC}"
sleep 10

# Check if app is healthy
if docker-compose -f "$COMPOSE_FILE" ps hearth-app | grep -q "Up"; then
    echo -e "${GREEN}✅ Application started successfully${NC}"
else
    echo -e "${RED}⚠️  Warning: Application may not have started correctly${NC}"
    echo "Check logs with: docker-compose -f docker-compose.prod.yml logs hearth-app"
fi

echo ""
echo -e "${GREEN}✅ Restore complete${NC}"
echo "Completed at: $(date)"
echo ""
echo "Next steps:"
echo "  1. Check application logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "  2. Verify you can login to the application"
