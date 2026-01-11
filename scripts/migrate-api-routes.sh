#!/bin/bash

# API Route Migration Script
# Automatically migrates Prisma + old auth to Supabase + data modules

echo "🚀 Starting API Route Migration..."
echo ""

# Count routes to migrate
TOTAL=$(find app/api -name "route.ts" -type f | wc -l | tr -d ' ')
ALREADY_MIGRATED=$(grep -r "getAuthContext\|createClient" app/api --include="*.ts" -l | wc -l | tr -d ' ')
REMAINING=$((TOTAL - ALREADY_MIGRATED))

echo "📊 Migration Status:"
echo "   Total Routes: $TOTAL"
echo "   Already Migrated: $ALREADY_MIGRATED"
echo "   Remaining: $REMAINING"
echo ""

# Find all routes still using old patterns
echo "🔍 Finding routes to migrate..."
ROUTES_TO_MIGRATE=$(grep -r "from '@/lib/auth'" app/api --include="*.ts" -l | grep route.ts)

echo "Found $(echo "$ROUTES_TO_MIGRATE" | wc -l | tr -d ' ') routes to migrate"
echo ""

# For each route, perform automatic replacements
for route in $ROUTES_TO_MIGRATE; do
  echo "📝 Migrating: $route"
  
  # Backup original
  cp "$route" "$route.backup"
  
  # Replace imports
  sed -i '' "s/import { auth } from '@\/lib\/auth';/import { createClient } from '@\/lib\/supabase\/server';\nimport { getAuthContext } from '@\/lib\/supabase\/server';/g" "$route"
  
  sed -i '' "s/import prisma from '@\/lib\/prisma';/\/\/ TODO: Replace with data module imports/g" "$route"
  
  # Replace auth calls
  sed -i '' "s/const session = await auth();/const authContext = await getAuthContext();/g" "$route"
  
  sed -i '' "s/session\?.user\?\.familyId/authContext?.defaultFamilyId/g" "$route"
  sed -i '' "s/session\.user\.familyId/authContext.defaultFamilyId/g" "$route"
  sed -i '' "s/session\?.user\?\.id/authContext?.defaultMemberId/g" "$route"
  sed -i '' "s/session\.user\.id/authContext.defaultMemberId/g" "$route"
  sed -i '' "s/session\?.user\?\.role/authContext?.memberships\[0\]?.role/g" "$route"
  sed -i '' "s/session\.user\.role/authContext.memberships\[0\]?.role/g" "$route"
  
  # Add TODO comments for manual review
  sed -i '' "s/await prisma\./\/\/ TODO: Replace with data module\n      await prisma./g" "$route"
  
  echo "   ✅ Automated replacements complete"
  echo "   ⚠️  Manual review needed for Prisma calls"
  echo ""
done

echo "🎉 Batch migration complete!"
echo ""
echo "⚠️  IMPORTANT: Next Steps"
echo "1. Review each migrated file (marked with TODO comments)"
echo "2. Replace Prisma calls with data module functions"
echo "3. Test each route"
echo "4. Remove .backup files when satisfied"
echo ""
echo "To see TODO items:"
echo "  grep -r 'TODO: Replace with data module' app/api"
echo ""
