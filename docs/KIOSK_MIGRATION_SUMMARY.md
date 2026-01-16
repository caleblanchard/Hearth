# Kiosk Module Supabase Migration Summary

**Date:** January 10, 2026  
**Phase:** Phase 7 - Kiosk Migration  
**Status:** API Routes Complete ✅

## Overview

Successfully migrated all kiosk-related API routes from Prisma + NextAuth to Supabase client and authentication.

## What Was Completed

### 1. Data Layer (`lib/data/kiosk.ts`) ✅

Created a comprehensive Supabase-based data layer with the following functions:

#### Session Management
- `createKioskSession(deviceId, familyId)` - Create/reactivate kiosk session
- `getKioskSession(sessionToken)` - Get session with member details
- `getKioskSessionByDevice(deviceId)` - Get session by device ID
- `updateKioskActivity(sessionToken)` - Update last activity timestamp
- `lockKioskSession(sessionToken)` - Clear current member (lock)
- `unlockKioskSession(sessionToken, memberId, pin)` - Authenticate member via PIN
- `endKioskSession(sessionToken)` - Mark session as inactive
- `getActiveFamilySessions(familyId)` - Get all active sessions for family

#### Settings Management
- `getOrCreateKioskSettings(familyId)` - Get or create default settings
- `updateKioskSettings(familyId, updates)` - Update kiosk settings

#### Helpers
- `checkAutoLock(session)` - Check if session exceeded timeout

### 2. API Routes Migration ✅

Updated all kiosk API endpoints to use Supabase:

#### Session Routes
- **POST `/api/kiosk/session/start`**
  - Changed from NextAuth to Supabase auth (`createClient()`, `getUser()`)
  - Changed from Prisma to Supabase data layer
  - Replaced `isParentInFamily()` helper
  - Updated audit logging to use Supabase
  - Updated field names to snake_case (database convention)

- **POST `/api/kiosk/session/unlock`**
  - Replaced kiosk-session lib with data/kiosk
  - Updated field name conversions
  - Updated audit logging

- **POST `/api/kiosk/session/lock`**
  - Migrated to Supabase client
  - Updated audit logging

- **GET `/api/kiosk/session`**
  - Updated to use Supabase data layer
  - Maintained auto-lock detection logic
  - Updated response field names

- **DELETE `/api/kiosk/session`**
  - Replaced Prisma member lookup with Supabase query
  - Updated audit logging
  - Maintained parent verification logic

- **POST `/api/kiosk/session/activity`**
  - Simple migration to Supabase data layer
  - Updated field names in response

#### Settings Routes
- **GET `/api/kiosk/settings`**
  - Added `familyId` query parameter (required for multi-tenant)
  - Replaced NextAuth with Supabase auth
  - Used `getOrCreateKioskSettings()` from data layer

- **PUT `/api/kiosk/settings`**
  - Added `familyId` in request body
  - Updated to use Supabase data layer
  - Maintained all validation logic
  - Updated field names to snake_case

### 3. Key Changes

#### Authentication
**Before:**
```typescript
const session = await auth();
if (!session || !session.user) {
  // ...
}
if (session.user.role !== 'PARENT') {
  // ...
}
```

**After:**
```typescript
const supabase = createClient();
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (!user || authError) {
  // ...
}
const isParent = await isParentInFamily(familyId);
if (!isParent) {
  // ...
}
```

#### Database Operations
**Before (Prisma):**
```typescript
const session = await prisma.kioskSession.findUnique({
  where: { sessionToken },
});
```

**After (Supabase):**
```typescript
const session = await getKioskSession(sessionToken);
// Uses Supabase client internally
```

#### Field Name Convention
**Before (camelCase):**
```typescript
{
  familyId: '...',
  currentMemberId: '...',
  lastActivityAt: new Date(),
  autoLockMinutes: 15
}
```

**After (snake_case):**
```typescript
{
  family_id: '...',
  current_member_id: '...',
  last_activity_at: new Date().toISOString(),
  auto_lock_minutes: 15
}
```

#### Audit Logging
**Before (Prisma):**
```typescript
await prisma.auditLog.create({
  data: {
    familyId,
    memberId,
    action: 'KIOSK_SESSION_STARTED',
    // ...
  }
});
```

**After (Supabase):**
```typescript
await supabase.from('audit_logs').insert({
  family_id: familyId,
  member_id: memberId,
  action: 'KIOSK_SESSION_STARTED',
  // ...
});
```

## Implementation Details

### Database Schema
The kiosk tables were already created in migration `00001_initial_schema.sql`:

```sql
CREATE TABLE kiosk_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL UNIQUE,
  session_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  is_active BOOLEAN NOT NULL DEFAULT true,
  current_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  auto_lock_minutes INT NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE kiosk_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL UNIQUE REFERENCES families(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_lock_minutes INT NOT NULL DEFAULT 15,
  enabled_widgets TEXT[] DEFAULT ARRAY['chores', 'calendar', 'weather'],
  allow_guest_view BOOLEAN NOT NULL DEFAULT true,
  require_pin_for_switch BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Row Level Security
RLS policies were already created in migration `00004_rls_policies.sql` for both tables, ensuring:
- Users can only access kiosk sessions/settings for their families
- Family isolation is enforced at the database level

## What's Left

### Testing
- [ ] Update integration tests to use Supabase mocks
- [ ] Run existing kiosk tests
- [ ] Fix any failing tests
- [ ] Manually test kiosk flow

### Components (if needed)
- [ ] Update `app/kiosk/page.tsx` if it directly uses old libraries
- [ ] Update any kiosk-related components that import old modules

### Documentation
- [ ] Update kiosk documentation if needed
- [ ] Document any breaking changes

## Testing Strategy

Since unit tests for the data layer were challenging due to Next.js `cookies()` context requirements, the recommendation is to:

1. **Integration Tests** - Test API routes which run in proper request context
2. **E2E Tests** - Test actual kiosk flows
3. **Manual Testing** - Verify PIN authentication, auto-lock, etc.

## Notes

- The data layer functions maintain the same business logic as the original `lib/kiosk-session.ts`
- All PIN authentication uses bcrypt (unchanged)
- Auto-lock timeout logic is identical
- Audit logging covers all major kiosk actions
- Multi-tenancy is enforced via `familyId` checks and RLS policies

## Related Files

### Created
- `lib/data/kiosk.ts` (298 lines)

### Modified
- `app/api/kiosk/session/start/route.ts`
- `app/api/kiosk/session/unlock/route.ts`
- `app/api/kiosk/session/lock/route.ts`
- `app/api/kiosk/session/route.ts`
- `app/api/kiosk/session/activity/route.ts`
- `app/api/kiosk/settings/route.ts`
- `SUPABASE_MIGRATION_CHECKLIST.md`

### Can Be Deprecated (After Testing)
- `lib/kiosk-session.ts` (once all tests pass)

---

**Next Steps:**
1. Run integration tests: `npm test -- __tests__/integration/api/kiosk`
2. Fix any failing tests
3. Manually test kiosk mode with Supabase backend
4. Update components if needed
5. Remove old `lib/kiosk-session.ts` after verification
