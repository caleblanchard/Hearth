# Local Testing Setup Guide

**Purpose:** Step-by-step guide to test the Supabase migration locally  
**Date:** January 10, 2026  
**Estimated Time:** 15-20 minutes

---

## Prerequisites

Before starting, ensure you have:
- ✅ Node.js 18+ installed
- ✅ Docker Desktop installed and running
- ✅ Supabase CLI installed (`npx supabase --version`)

---

## Step 1: Verify Supabase is Running

Check if Supabase local instance is already running:

```bash
supabase status
```

### If Running (Seeing URLs and Keys)
You'll see output like:
```
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
Anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Service role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**→ Skip to Step 2**

### If Not Running
```bash
cd /Users/cblanchard/Repos/Hearth

# Start Supabase
supabase start
```

This will:
- Start Docker containers
- Apply all migrations
- Take ~2-3 minutes first time

---

## Step 2: Configure Environment Variables

Create/update your local `.env.local` file:

```bash
# Create the file
cat > .env.local << 'EOF'
# Supabase Local Instance
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Service Role Key (for admin operations)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
EOF
```

**Note:** These are Supabase's default local keys - safe for development.

---

## Step 3: Verify Database Schema

Check that all migrations were applied:

```bash
# List migrations
supabase migration list

# You should see (all applied):
# ✓ 00001_initial_schema
# ✓ 00002_module_tables
# ✓ 00003_rls_functions
# ✓ 00004_rls_policies
# ✓ 00005_additional_indexes
```

### If Migrations Not Applied

```bash
# Reset database and apply all migrations
supabase db reset

# This is safe - it's local only
```

---

## Step 4: Generate TypeScript Types

Ensure types are up to date:

```bash
# Generate types from local database
supabase gen types typescript --local > lib/database.types.ts

# Verify file was created (should be ~167KB)
ls -lh lib/database.types.ts
```

You should see:
```
-rw-r--r--  1 user  staff   167K Jan 10 XX:XX lib/database.types.ts
```

---

## Step 5: Install Dependencies

```bash
# Install/update dependencies
npm install

# Verify Supabase packages are installed
npm list | grep supabase
```

You should see:
```
├── @supabase/ssr@0.1.0
└── @supabase/supabase-js@2.39.3
```

---

## Step 6: Seed Test Data (Optional)

Create a test family and users:

```bash
# Open Supabase Studio
open http://localhost:54323

# Or run seed script if you have one
npm run seed
```

### Manual Test Data via Studio

1. Go to http://localhost:54323
2. Navigate to **Authentication** → **Users**
3. Click **Add user**
4. Create test user:
   ```
   Email: test@hearth.local
   Password: test123456
   Auto Confirm User: ✓
   ```
5. Copy the user's UUID

6. Navigate to **Table Editor** → **families**
7. Click **Insert row**
   ```
   name: Test Family
   timezone: America/New_York
   ```
8. Copy the family UUID

9. Navigate to **family_members**
10. Click **Insert row**
    ```
    family_id: [paste family UUID]
    auth_user_id: [paste user UUID]
    name: Test Parent
    role: PARENT
    is_active: true
    ```

---

## Step 7: Run Tests

Verify everything works:

```bash
# Run all tests
npm test

# Or run specific test suites
npm test -- __tests__/integration/api/kiosk
npm test -- __tests__/lib/test-utils
```

**Expected Results:**
```
✓ Supabase Mock Tests:     18/18 (100%)
✓ Kiosk Session Tests:     18/18 (100%)
✓ Kiosk Settings Tests:    10/10 (100%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TOTAL:                   46/46 (100%)
```

---

## Step 8: Start Development Server

```bash
# Start Next.js dev server
npm run dev
```

The app will be available at: http://localhost:3000

---

## Step 9: Test Authentication Flow

### Test Sign Up

1. Go to http://localhost:3000
2. Click **Sign Up** (or navigate to `/auth/signup`)
3. Fill in the form:
   ```
   Email: parent@test.com
   Password: password123
   Family Name: My Test Family
   Your Name: Parent User
   Role: Parent
   ```
4. Click **Create Account**

**Expected:** You should be redirected to `/dashboard`

### Test Sign In

1. Sign out (if signed in)
2. Go to http://localhost:3000/auth/signin
3. Enter credentials:
   ```
   Email: parent@test.com
   Password: password123
   ```
4. Click **Sign In**

**Expected:** Redirected to `/dashboard`

---

## Step 10: Test Data Layer Functions

Create a test API route to verify data modules work:

```bash
# Create test route
mkdir -p app/api/test
cat > app/api/test/route.ts << 'EOF'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserFamilies } from '@/lib/data/families'
import { getMembers } from '@/lib/data/members'
import { getChoreDefinitions } from '@/lib/data/chores'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Test data layer functions
    const families = await getUserFamilies(user.id)
    
    if (families.length === 0) {
      return NextResponse.json({ message: 'No families found for user' })
    }

    const familyId = families[0].id
    const members = await getMembers(familyId)
    const chores = await getChoreDefinitions(familyId)

    return NextResponse.json({
      message: 'Data layer working!',
      user: { id: user.id, email: user.email },
      families: families.length,
      members: members.length,
      chores: chores.length
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Data layer error', details: error.message },
      { status: 500 }
    )
  }
}
EOF
```

### Test the endpoint

1. Make sure dev server is running (`npm run dev`)
2. Sign in to the app
3. Visit: http://localhost:3000/api/test

**Expected Response:**
```json
{
  "message": "Data layer working!",
  "user": {
    "id": "uuid-here",
    "email": "parent@test.com"
  },
  "families": 1,
  "members": 1,
  "chores": 0
}
```

---

## Step 11: Test Kiosk Mode

### Set a PIN for a Member

1. Open Supabase Studio: http://localhost:54323
2. Navigate to **SQL Editor**
3. Run this query (replace the UUIDs):

```sql
-- Get your member ID first
SELECT id, name FROM family_members WHERE name = 'Parent User';

-- Set PIN (hashed with bcrypt)
-- PIN: 1234
UPDATE family_members 
SET pin_hash = '$2b$10$rQJ5Y8qZ8f8f8f8f8f8f8eDummy' 
WHERE id = 'your-member-id';

-- Better: use the actual bcrypt hash
-- You can generate it at https://bcrypt-generator.com/
-- Input: 1234, Rounds: 10
```

### Test Kiosk Session

Using curl or Postman:

```bash
# 1. Create kiosk session
curl -X POST http://localhost:3000/api/kiosk/session \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test-device-1",
    "familyId": "your-family-id"
  }'

# Response: { session_token: "abc123..." }

# 2. Unlock kiosk with PIN
curl -X POST http://localhost:3000/api/kiosk/session/unlock \
  -H "Content-Type: application/json" \
  -d '{
    "sessionToken": "abc123...",
    "memberId": "your-member-id",
    "pin": "1234"
  }'

# Response: { success: true, member: {...} }
```

---

## Step 12: View Database in Studio

Explore your data in Supabase Studio:

```bash
open http://localhost:54323
```

### Useful Views

1. **Table Editor** - View/edit all tables
2. **Authentication** - Manage users
3. **SQL Editor** - Run custom queries
4. **Database** → **Roles** - View RLS policies
5. **Logs** - View query logs

### Sample Queries to Try

```sql
-- View all families
SELECT * FROM families;

-- View all members with their families
SELECT m.*, f.name as family_name 
FROM family_members m
JOIN families f ON m.family_id = f.id;

-- View RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';

-- Test RLS as a specific user
SET request.jwt.claims.sub = 'user-uuid-here';
SELECT * FROM families;
-- Should only return families this user belongs to
```

---

## Troubleshooting

### Issue: "Cannot connect to Supabase"

**Check Docker is running:**
```bash
docker ps
# Should see containers: supabase_db, supabase_kong, etc.
```

**Restart Supabase:**
```bash
supabase stop
supabase start
```

### Issue: "Type errors with database.types.ts"

**Regenerate types:**
```bash
supabase gen types typescript --local > lib/database.types.ts
```

### Issue: "Auth user not found"

**Check user exists:**
```bash
# Open Studio
open http://localhost:54323

# Go to Authentication → Users
# Verify user is there and confirmed
```

### Issue: "No rows returned from queries"

**Check RLS policies:**
```sql
-- In SQL Editor (http://localhost:54323)
-- Check if user has family membership
SELECT 
  u.id as user_id,
  u.email,
  m.id as member_id,
  m.name as member_name,
  f.id as family_id,
  f.name as family_name
FROM auth.users u
LEFT JOIN family_members m ON m.auth_user_id = u.id
LEFT JOIN families f ON f.id = m.family_id
WHERE u.email = 'your-email@test.com';
```

If no results, create the family membership:
```sql
INSERT INTO family_members (family_id, auth_user_id, name, role, is_active)
VALUES (
  'your-family-id',
  'your-user-id',
  'Your Name',
  'PARENT',
  true
);
```

### Issue: "Tests failing"

**Clear test cache:**
```bash
npm test -- --clearCache
npm test
```

**Check mocks are working:**
```bash
npm test -- __tests__/lib/test-utils
```

### Issue: "Port already in use"

**Supabase ports in use:**
```bash
# Stop Supabase
supabase stop

# Start again
supabase start
```

**Next.js port in use:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

---

## Quick Test Checklist

Once setup is complete, verify these work:

- [ ] Supabase is running (`supabase status`)
- [ ] Types are generated (`lib/database.types.ts` exists)
- [ ] Tests pass (`npm test` = 100%)
- [ ] Dev server starts (`npm run dev`)
- [ ] Can sign up new user
- [ ] Can sign in
- [ ] Can view dashboard
- [ ] Test API endpoint returns data (`/api/test`)
- [ ] Database visible in Studio (http://localhost:54323)

---

## Environment Variables Reference

### Development (.env.local)
```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

**Note:** These are Supabase's official local development keys. They are public and safe to use locally.

---

## Useful Commands Reference

```bash
# Supabase Commands
supabase start              # Start local instance
supabase stop               # Stop local instance
supabase status             # Show running status
supabase db reset           # Reset database (applies migrations)
supabase db push            # Push local migrations to remote
supabase migration list     # List all migrations
supabase gen types typescript --local > lib/database.types.ts  # Generate types

# Next.js Commands
npm run dev                 # Start dev server
npm run build               # Build for production
npm test                    # Run all tests
npm test -- --watch         # Run tests in watch mode

# Docker Commands (if needed)
docker ps                   # List running containers
docker stop $(docker ps -q) # Stop all containers
docker system prune         # Clean up Docker
```

---

## Test Data Script (Optional)

Create a script to quickly seed test data:

```bash
cat > scripts/seed-test-data.sql << 'EOF'
-- Delete existing test data (optional)
DELETE FROM family_members WHERE family_id IN (SELECT id FROM families WHERE name LIKE 'Test%');
DELETE FROM families WHERE name LIKE 'Test%';

-- Create test family
INSERT INTO families (id, name, timezone, settings) VALUES
  ('test-family-1', 'Test Family', 'America/New_York', '{}');

-- Create test users (requires auth users to exist first)
-- You'll need to create these via the auth UI or API

-- Create test members
INSERT INTO family_members (id, family_id, auth_user_id, name, role, is_active) VALUES
  ('test-parent-1', 'test-family-1', 'your-auth-user-id-1', 'Test Parent', 'PARENT', true),
  ('test-child-1', 'test-family-1', 'your-auth-user-id-2', 'Test Child', 'CHILD', true);

-- Create test chores
INSERT INTO chore_definitions (family_id, name, description, credit_value, frequency, category) VALUES
  ('test-family-1', 'Make Bed', 'Make your bed in the morning', 5, 'DAILY', 'BEDROOM'),
  ('test-family-1', 'Dishes', 'Load and unload dishwasher', 10, 'DAILY', 'KITCHEN'),
  ('test-family-1', 'Vacuum', 'Vacuum living room', 20, 'WEEKLY', 'LIVING_ROOM');

-- Create test recipes
INSERT INTO recipes (family_id, created_by, name, description, instructions, servings, difficulty) VALUES
  ('test-family-1', 'test-parent-1', 'Spaghetti', 'Classic spaghetti', 'Boil water, cook pasta, add sauce', 4, 'EASY'),
  ('test-family-1', 'test-parent-1', 'Tacos', 'Taco Tuesday!', 'Cook meat, prepare toppings', 4, 'EASY');

SELECT 'Test data created!' as status;
EOF
```

Run it:
```bash
supabase db execute -f scripts/seed-test-data.sql
```

---

## Next Steps After Testing

Once local testing is working:

1. **Manual Testing**
   - Test all major features
   - Verify RLS isolation (create 2nd family)
   - Check error handling

2. **Optional: Migrate API Routes**
   - Update routes to use data modules
   - Ensures consistency

3. **Deploy to Production (Phase 8)**
   - Create Supabase production project
   - Deploy to Vercel
   - Test in production

---

## Getting Help

If you encounter issues:

1. **Check Logs**
   ```bash
   # Supabase logs
   supabase logs
   
   # Next.js dev server logs
   # (in terminal running npm run dev)
   ```

2. **Check Studio**
   - View data in tables
   - Check RLS policies
   - Run SQL queries

3. **Verify Environment**
   ```bash
   echo $NEXT_PUBLIC_SUPABASE_URL
   cat .env.local
   ```

4. **Reset Everything**
   ```bash
   supabase stop
   supabase db reset
   npm run dev
   ```

---

**Setup Complete!** You're ready to test Hearth locally with Supabase! 🚀

**Estimated Total Time:** 15-20 minutes  
**Next:** Test the application, then proceed to Phase 8 (Production Deployment)
