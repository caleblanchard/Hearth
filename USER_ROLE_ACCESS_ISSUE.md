# User Role Access Issue - Needs Proper Fix

**Current Status:** Temporary workaround in place  
**Priority:** Medium (app will load but role checks won't work correctly)

---

## The Problem

After migrating from NextAuth to Supabase Auth, the `user` object structure changed:

### Before (NextAuth)
```typescript
const { data: session } = useSession()
session.user.id        // User ID
session.user.name      // Name
session.user.email     // Email
session.user.role      // PARENT or CHILD ✅
session.user.familyId  // Family UUID ✅
```

### After (Supabase Auth)
```typescript
const { user } = useSupabaseSession()
user.id                   // User ID ✅
user.email                // Email ✅
user.user_metadata.name   // Name ✅
user.user_metadata.role   // ❌ NOT SET (we don't store it here)
// No familyId available    ❌
```

---

## Current Workaround

Changed all references from:
```typescript
user?.role           // Won't work
```

To:
```typescript
user?.user_metadata?.role   // Also won't work, but won't crash
```

This prevents runtime errors but **role checks will always fail** (treated as undefined).

---

## Proper Solution

### Option 1: Fetch Member Record (Recommended)

Create a hook that fetches the user's `family_member` record:

```typescript
// hooks/useMemberContext.ts
export function useMemberContext() {
  const { user, loading: authLoading } = useSupabaseSession()
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    async function fetchMember() {
      const supabase = createClient()
      const { data } = await supabase
        .from('family_members')
        .select('id, name, role, family_id, avatar_url')
        .eq('auth_user_id', user.id)
        .single()
      
      setMember(data)
      setLoading(false)
    }

    fetchMember()
  }, [user])

  return { user, member, loading: authLoading || loading }
}
```

Then update all pages:

```typescript
// Before
const { user } = useSupabaseSession()
if (user?.role === 'PARENT') { ... }

// After
const { user, member } = useMemberContext()
if (member?.role === 'PARENT') { ... }
```

### Option 2: Store Role in user_metadata

Update `lib/auth/signup.ts` to set role in user metadata during signup:

```typescript
const { data: authData } = await supabase.auth.signUp({
  email: data.email,
  password: data.password,
  options: {
    data: {
      name: data.parentName,
      role: 'PARENT',  // Add this
    },
  },
})
```

**Issue:** This only works for parents during initial signup. Children (added later) won't have this set.

### Option 3: Remove Client-Side Role Checks

Rely entirely on API authorization:

```typescript
// Remove client-side checks
// if (user?.role !== 'PARENT') { router.push('/dashboard') }

// Let the API handle it
const response = await fetch('/api/screentime/family')
if (response.status === 403) {
  // Not authorized - redirect
  router.push('/dashboard')
}
```

---

## Affected Files (50+ files)

### Pages with Role Checks
- `app/dashboard/settings/modules/page.tsx`
- `app/dashboard/chores/manage/page.tsx`
- `app/dashboard/medications/page.tsx`
- `app/dashboard/pets/**/*.tsx`
- `app/dashboard/screentime/**/*.tsx`
- `app/dashboard/projects/**/*.tsx`
- `app/dashboard/health/**/*.tsx`
- `app/dashboard/rewards/page.tsx`
- `app/dashboard/family/page.tsx`
- `app/dashboard/sick-mode/page.tsx`
- `app/dashboard/communication/page.tsx`
- `app/dashboard/reports/page.tsx`

### Components with Role Checks
- `components/dashboard/Sidebar.tsx`
- `components/dashboard/DashboardNav.tsx`

---

## Impact

### What Still Works ✅
- Authentication (sign in/out)
- Page rendering
- API calls (server-side auth works fine)
- Guest sessions

### What Doesn't Work ❌
- Client-side role-based UI hiding (parent-only buttons)
- Client-side redirects for non-parents
- Role-based navigation filtering
- Role badges in UI

### What Protects Users 🛡️
- **Server-side authorization** - All API endpoints check roles properly
- **RLS policies** - Database enforces permissions
- Users won't see errors, just won't see role-specific features

---

## Recommended Action Plan

1. **Immediate** (✅ Done)
   - Fixed runtime errors by changing `user.role` to `user.user_metadata.role`
   - App loads and basic functionality works

2. **Short Term** (Recommended)
   - Create `useMemberContext` hook (Option 1)
   - Update 10-15 most critical pages
   - Test role-based features work

3. **Long Term** (Optional)
   - Systematic migration of all 50+ files
   - Add caching to avoid repeated member fetches
   - Consider using React Context for member data

---

## Testing Without Fix

You can test the app now! Here's what will happen:

```bash
# Sign in as a parent
# Dashboard loads ✅
# But parent-only features might be hidden ❌

# API calls still work because server checks auth properly
# So functionality works, just UI might be confusing
```

---

## Quick Test

To verify the app works despite this issue:

1. Complete onboarding (creates a parent user)
2. Visit dashboard - should load
3. Try accessing parent-only pages:
   - `/dashboard/family` - Might redirect, but try the API directly
   - `/dashboard/settings/modules` - Same
4. Check browser console for errors

If no errors, the app is functional! Just missing some UI elements.

---

**Status:** App is usable, but role-based UI features disabled  
**Fix Required:** Yes (Option 1 recommended)  
**Urgency:** Medium (can be done after initial testing)  
**Estimated Effort:** 2-4 hours to implement Option 1

---

**Last Updated:** January 10, 2026  
**Next Step:** Create `useMemberContext` hook for proper role access
