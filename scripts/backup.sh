#!/bin/bash

# HouseholdERP Database Backup Script
#
# This script creates a backup of the PostgreSQL database
# and keeps the last 30 days of backups.
#
# Usage: ./scripts/backup.sh
# Or add to crontab: 0 2 * * * /opt/householderp/scripts/backup.sh

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_DIR}/backups"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.prod.yml"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🗄️  HouseholdERP Database Backup${NC}"
echo "Started at: $(date)"
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if docker-compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}❌ Error: docker-compose.prod.yml not found at $COMPOSE_FILE${NC}"
    exit 1
fi

# Check if database container is running
if ! docker-compose -f "$COMPOSE_FILE" ps hearth-db | grep -q "Up"; then
    echo -e "${RED}❌ Error: Database container is not running${NC}"
    exit 1
fi

# Create backup
echo -e "${YELLOW}📦 Creating backup...${NC}"
if docker-compose -f "$COMPOSE_FILE" exec -T hearth-db pg_dump -U hearth_user hearth_db | gzip > "$BACKUP_FILE"; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup created successfully: $BACKUP_FILE ($BACKUP_SIZE)${NC}"
else
    echo -e "${RED}❌ Backup failed${NC}"
    exit 1
fi

# Clean up old backups
echo -e "${YELLOW}🧹 Cleaning up old backups (older than $RETENTION_DAYS days)...${NC}"
OLD_BACKUPS=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS)

if [ -n "$OLD_BACKUPS" ]; then
    echo "$OLD_BACKUPS" | while read -r file; do
        rm "$file"
        echo "   Deleted: $(basename "$file")"
    done
    echo -e "${GREEN}✅ Cleanup complete${NC}"
else
    echo "   No old backups to remove"
fi

# Show backup summary
echo ""
echo -e "${GREEN}📊 Backup Summary:${NC}"
echo "   Total backups: $(find "$BACKUP_DIR" -name "backup_*.sql.gz" | wc -l)"
echo "   Disk usage: $(du -sh "$BACKUP_DIR" | cut -f1)"
echo "   Latest backup: $BACKUP_FILE"
echo ""
echo "Completed at: $(date)"
