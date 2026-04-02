#!/bin/bash

# Hearth Quick Deployment Script
#
# This script automates the deployment process
# Usage: ./deploy.sh

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║           Hearth - Deployment Script               ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo -e "${YELLOW}📝 Creating .env from template...${NC}"

    if [ -f .env.production ]; then
        cp .env.production .env
        echo -e "${GREEN}✅ .env file created from .env.production${NC}"
        echo ""
        echo -e "${RED}⚠️  IMPORTANT: Edit .env and configure the following:${NC}"
        echo "   1. POSTGRES_PASSWORD - Set a strong database password"
        echo "   2. NEXT_PUBLIC_SUPABASE_URL - Supabase project URL"
        echo "   3. NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase anon key"
        echo "   4. SUPABASE_SERVICE_ROLE_KEY - Supabase service role key"
        echo "   5. TOKEN_ENCRYPTION_SECRET - Generate with: openssl rand -base64 32"
        echo "   6. NEXT_PUBLIC_APP_URL - Set to your server's URL"
        echo ""
        read -p "Press Enter after you've configured .env..."
    else
        echo -e "${RED}❌ .env.production template not found${NC}"
        exit 1
    fi
fi

# Verify required environment variables
echo -e "${YELLOW}🔍 Verifying environment configuration...${NC}"

source .env 2>/dev/null || true

if [ -z "$POSTGRES_PASSWORD" ] || [ "$POSTGRES_PASSWORD" = "CHANGE_ME_STRONG_PASSWORD" ]; then
    echo -e "${RED}❌ POSTGRES_PASSWORD not set or using default value${NC}"
    echo "   Edit .env and set a strong password"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ "$NEXT_PUBLIC_SUPABASE_URL" = "CHANGE_ME_SUPABASE_URL" ]; then
    echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_URL not set or using default value${NC}"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ] || [ "$NEXT_PUBLIC_SUPABASE_ANON_KEY" = "CHANGE_ME_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not set or using default value${NC}"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] || [ "$SUPABASE_SERVICE_ROLE_KEY" = "CHANGE_ME_SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ SUPABASE_SERVICE_ROLE_KEY not set or using default value${NC}"
    exit 1
fi

if [ -z "$TOKEN_ENCRYPTION_SECRET" ] || [ "$TOKEN_ENCRYPTION_SECRET" = "CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_BASE64_32" ]; then
    echo -e "${RED}❌ TOKEN_ENCRYPTION_SECRET not set or using default value${NC}"
    echo "   Generate with: openssl rand -base64 32"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_APP_URL" ] || [ "$NEXT_PUBLIC_APP_URL" = "http://localhost:3000" ]; then
    echo -e "${YELLOW}⚠️  NEXT_PUBLIC_APP_URL is set to localhost${NC}"
    echo "   You may want to set this to your server's public URL"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}✅ Environment configuration verified${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "   Install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "   Install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✅ Docker and Docker Compose found${NC}"
echo ""

# Check if containers are already running
if docker-compose -f infra/docker/docker-compose.prod.yml ps | grep -q "Up"; then
    echo -e "${YELLOW}⚠️  Containers are already running${NC}"
    read -p "Do you want to rebuild and restart? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}📦 Stopping existing containers...${NC}"
        docker-compose -f infra/docker/docker-compose.prod.yml down
    else
        echo "Deployment cancelled."
        exit 0
    fi
fi

# Build and start containers
echo -e "${YELLOW}🏗️  Building containers...${NC}"
docker-compose -f infra/docker/docker-compose.prod.yml build

echo -e "${YELLOW}🚀 Starting containers...${NC}"
docker-compose -f infra/docker/docker-compose.prod.yml up -d

# Wait for database to be ready
echo -e "${YELLOW}⏳ Waiting for database to be ready...${NC}"
for i in {1..30}; do
    if docker-compose -f infra/docker/docker-compose.prod.yml exec -T hearth-db pg_isready -U hearth_user -d hearth_db &> /dev/null; then
        echo -e "${GREEN}✅ Database is ready${NC}"
        break
    fi

    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Database failed to start${NC}"
        echo "Check logs with: docker-compose -f infra/docker/docker-compose.prod.yml logs hearth-db"
        exit 1
    fi

    sleep 2
done

# Wait for application to be ready
echo -e "${YELLOW}⏳ Waiting for application to be ready...${NC}"
for i in {1..30}; do
    if curl -f http://localhost:${APP_PORT:-3000}/api/health &> /dev/null; then
        echo -e "${GREEN}✅ Application is ready${NC}"
        break
    fi

    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}⚠️  Application may not be fully ready${NC}"
        echo "Check logs with: docker-compose -f infra/docker/docker-compose.prod.yml logs hearth-app"
        break
    fi

    sleep 2
done

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""

# Check if admin user exists
ADMIN_COUNT=$(docker-compose -f infra/docker/docker-compose.prod.yml exec -T hearth-db psql -U hearth_user hearth_db -t -c "SELECT COUNT(*) FROM family_members WHERE role = 'PARENT';" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$ADMIN_COUNT" = "0" ]; then
    echo -e "${YELLOW}📝 No admin user found${NC}"
    echo ""
    read -p "Would you like to create an admin user now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose -f infra/docker/docker-compose.prod.yml exec hearth-app npx tsx scripts/create-admin.ts
    else
        echo ""
        echo -e "${YELLOW}ℹ️  Create an admin user later with:${NC}"
        echo "   docker-compose -f infra/docker/docker-compose.prod.yml exec hearth-app npx tsx scripts/create-admin.ts"
    fi
fi

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                           ║${NC}"
echo -e "${BLUE}║                 Deployment Information                    ║${NC}"
echo -e "${BLUE}║                                                           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Application URL:${NC} ${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo "  View logs:         docker-compose -f infra/docker/docker-compose.prod.yml logs -f"
echo "  Stop application:  docker-compose -f infra/docker/docker-compose.prod.yml down"
echo "  Restart:           docker-compose -f infra/docker/docker-compose.prod.yml restart"
echo "  Create backup:     ./scripts/backup.sh"
echo "  Create admin:      docker-compose -f infra/docker/docker-compose.prod.yml exec hearth-app npx tsx scripts/create-admin.ts"
echo ""
echo -e "${GREEN}📚 Full documentation: DEPLOYMENT.md${NC}"
echo ""
