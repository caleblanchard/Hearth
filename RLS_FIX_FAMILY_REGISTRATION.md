# RLS (Row Level Security) Fix - Family Registration

## Problem

When attempting to register a new family, the signup process was failing with:

```
Error: Failed to create family: new row violates row-level security policy for table "families"
```

## Root Cause

This is a classic **chicken-and-egg problem** with Row Level Security:

1. User signs up with Supabase Auth
2. User is now authenticated but has **no family_id** yet
3. Code tries to create a family record
4. RLS policies check if user belongs to a family (via `get_user_family_ids()`)
5. User doesn't belong to any family yet → **RLS policy fails**

### The RLS Policy
```sql
CREATE POLICY "Parents can insert families" ON families
  FOR INSERT WITH CHECK (true); -- Should allow all inserts
```

Even though the policy says `WITH CHECK (true)`, the issue is that the **regular Supabase client** (anon key) still goes through RLS evaluation, and the helper functions return empty results for a user with no family.

## Solution

Use the **Service Role** client to bypass RLS during initial family creation.

### Created: Admin Client

**File:** `lib/supabase/admin.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
```

**Key Points:**
- Uses `SUPABASE_SERVICE_ROLE_KEY` instead of anon key
- **Bypasses ALL RLS policies** - admin access
- Should only be used server-side
- Never expose service role key to client

### Updated: Family Registration

**File:** `lib/auth/signup.ts`

**Before:**
```typescript
const supabase = createClient() // Regular client with RLS

// This fails because user has no family_id yet
const family = await createFamily({ name: familyName })
```

**After:**
```typescript
const supabase = await createClient()      // For auth operations
const adminClient = createAdminClient()    // For bypassing RLS

// Step 1: Create auth user (using regular client)
await supabase.auth.signUp({ email, password })

// Step 2: Create family (using admin client - bypasses RLS)
const { data: family } = await adminClient
  .from('families')
  .insert({ name: familyName })
  .select()
  .single()

// Step 3: Create family member (using admin client)
await adminClient
  .from('family_members')
  .insert({ 
    family_id: family.id,
    auth_user_id: authData.user.id,
    role: 'PARENT'
  })
```

## Security Considerations

### ✅ Safe Usage
The admin client is **safe to use** during signup because:
1. It runs server-side only (never exposed to browser)
2. It's only used for the initial family+member creation
3. After creation, user has a family_id and regular RLS works
4. Service role key is in environment variables (never committed)

### ⚠️ When to Use Admin Client
- ✅ New family registration
- ✅ Admin operations (bulk updates, reports)
- ✅ Background jobs (cron, data migrations)
- ✅ System-initiated actions (auto-cleanup, etc.)

### 🚫 When NOT to Use Admin Client
- ❌ Regular user operations (use regular client with RLS)
- ❌ Any client-side code
- ❌ User-initiated CRUD operations (RLS should protect these)

## Testing

After the fix, signup should work:

1. Visit `/auth/signup`
2. Fill in:
   - Family name: "Test Family"
   - Your name: "John Doe"
   - Email: "test@example.com"
   - Password: "Password123"
3. Click "Create Account"
4. Should successfully create:
   - ✅ Auth user in `auth.users`
   - ✅ Family record in `families`
   - ✅ Member record in `family_members` with correct `auth_user_id`
5. Should redirect to `/dashboard`

## Verification

Check the database:

```sql
-- Check auth user was created
SELECT id, email FROM auth.users;

-- Check family was created
SELECT id, name FROM families;

-- Check member was created and linked
SELECT 
  fm.id, 
  fm.name, 
  fm.role,
  fm.family_id,
  fm.auth_user_id,
  f.name as family_name
FROM family_members fm
JOIN families f ON f.id = fm.family_id;
```

Should see all three records properly linked.

## Other Functions Updated

### `checkEmailAvailable()`

Also updated to use admin client since it's called **before** authentication:

```typescript
export async function checkEmailAvailable(email: string) {
  const adminClient = createAdminClient()
  
  const { data } = await adminClient
    .from('family_members')
    .select('id')
    .eq('email', email)
    .limit(1)
  
  return !data || data.length === 0
}
```

## Files Changed

1. ✅ **lib/supabase/admin.ts** (new) - Admin client factory
2. ✅ **lib/auth/signup.ts** (updated) - Use admin client for registration

## Related Documentation

- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
- Service Role: https://supabase.com/docs/guides/api/api-keys#the-servicerole-key

---

**Status:** ✅ Fixed  
**Date:** January 10, 2026  
**Impact:** Family registration now works correctly
