# Schema Mismatch Fixed! ✅

**Error:** `Could not find the 'is_active' column of 'families' in the schema cache`

---

## Root Cause

The `registerFamily()` function was trying to insert columns that **don't exist** in the `families` table:
- ❌ `is_active` - Only exists in `family_members`, not `families`
- ❌ `subscription_tier` - Doesn't exist in schema
- ❌ `max_members` - Doesn't exist in schema

---

## Actual Schema

### `families` Table (from `00001_initial_schema.sql`)
```sql
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Key points:**
- ✅ Has: `name`, `timezone`, `location`, `latitude`, `longitude`, `settings`
- ❌ Does NOT have: `is_active`, `subscription_tier`, `max_members`

---

## What Was Fixed

### Before (`lib/auth/signup.ts`)
```typescript
const { data: family } = await adminClient
  .from('families')
  .insert({
    name: data.familyName,
    timezone: data.timezone || '...',
    subscription_tier: 'FREE',  // ❌ Doesn't exist!
    max_members: 10,            // ❌ Doesn't exist!
    is_active: true,            // ❌ Doesn't exist!
  })
```

### After
```typescript
const { data: family } = await adminClient
  .from('families')
  .insert({
    name: data.familyName,
    timezone: data.timezone || '...',
    location: data.location || null,     // ✅ Exists
    latitude: data.latitude || null,     // ✅ Exists
    longitude: data.longitude || null,   // ✅ Exists
  })
```

---

## Changes Made

### 1. Updated Insert Statement
Removed non-existent fields and added location fields that the schema supports.

### 2. Updated Interface
```typescript
export interface FamilyRegistrationData {
  familyName: string
  timezone?: string
  location?: string | null      // Added
  latitude?: number | null      // Added
  longitude?: number | null     // Added
  parentName: string
  email: string
  password: string
  pin?: string
}
```

### 3. Updated Return Type
```typescript
export interface RegistrationResult {
  success: boolean
  familyId?: string
  memberId?: string
  userId?: string
  family?: any     // Added - needed by onboarding endpoint
  member?: any     // Added - needed by onboarding endpoint
  error?: string
}
```

---

## Why This Happened

The `registerFamily()` function was likely copied from old code that assumed additional fields. The actual Supabase schema only has the essential fields.

---

## Testing

Now the onboarding should work:

```bash
# Visit http://localhost:3000/onboarding
# Fill in all fields including location (optional)
# Submit
# ✅ Should create family successfully!
```

---

## Related Files

- **`lib/auth/signup.ts`** - Fixed insert statement
- **`supabase/migrations/00001_initial_schema.sql`** - Source of truth for schema
- **`app/api/onboarding/setup/route.ts`** - Uses registerFamily()

---

## Status

All three issues now fixed:
1. ✅ **NextAuth client error** - Migrated to Supabase
2. ✅ **RLS policy violation** - Using admin client
3. ✅ **Schema mismatch** - Insert only valid columns

**Onboarding should now work completely!** 🎉

---

**Last Updated:** January 10, 2026  
**Status:** ✅ **Schema Fixed**  
**Next:** Test the complete onboarding flow!
