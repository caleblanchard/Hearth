# NextAuth to Supabase Auth Migration Guide

## Overview

Replacing all NextAuth hooks and functions with Supabase Auth equivalents in client components.

## Migration Patterns

### 1. useSession Hook

**Before (NextAuth):**
```typescript
import { useSession } from 'next-auth/react'

function MyComponent() {
  const { data: session, status } = useSession()
  const loading = status === 'loading'
  
  if (loading) return <div>Loading...</div>
  if (!session) return <div>Not logged in</div>
  
  return <div>Hello {session.user.name}</div>
}
```

**After (Supabase):**
```typescript
import { useSupabaseSession } from '@/hooks/useSupabaseSession'

function MyComponent() {
  const { user, loading } = useSupabaseSession()
  
  if (loading) return <div>Loading...</div>
  if (!user) return <div>Not logged in</div>
  
  return <div>Hello {user.user_metadata.name}</div>
}
```

### 2. signOut Function

**Before (NextAuth):**
```typescript
import { signOut } from 'next-auth/react'

function LogoutButton() {
  return (
    <button onClick={() => signOut()}>
      Sign Out
    </button>
  )
}
```

**After (Supabase):**
```typescript
import { signOut } from '@/hooks/useSupabaseSession'

function LogoutButton() {
  return (
    <button onClick={signOut}>
      Sign Out
    </button>
  )
}
```

### 3. signIn Function

**Before (NextAuth):**
```typescript
import { signIn } from 'next-auth/react'

await signIn('credentials', {
  email: 'user@example.com',
  password: 'password',
  redirect: false,
})
```

**After (Supabase):**
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
})
```

### 4. SessionProvider (Not Needed)

**Before (NextAuth):**
```typescript
// app/layout.tsx
import SessionProvider from '@/components/SessionProvider'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
```

**After (Supabase):**
```typescript
// app/layout.tsx
// No SessionProvider needed - Supabase uses cookies

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
      </body>
    </html>
  )
}
```

## Field Mapping

### Session Object

| NextAuth | Supabase | Notes |
|----------|----------|-------|
| `session.user.id` | `user.id` | User ID |
| `session.user.email` | `user.email` | Email |
| `session.user.name` | `user.user_metadata.name` | Name stored in metadata |
| `session.user.role` | N/A | Get from `family_members` table |
| `session.user.familyId` | N/A | Get from `family_members` table |

### Getting Extended User Data

Since Supabase Auth only stores basic user info, you'll need to query the `family_members` table for role and family info:

```typescript
import { useSupabaseSession } from '@/hooks/useSupabaseSession'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function MyComponent() {
  const { user, loading } = useSupabaseSession()
  const [member, setMember] = useState(null)
  
  useEffect(() => {
    if (!user) return
    
    const supabase = createClient()
    supabase
      .from('family_members')
      .select('id, name, role, family_id')
      .eq('auth_user_id', user.id)
      .single()
      .then(({ data }) => setMember(data))
  }, [user])
  
  if (loading || !member) return <div>Loading...</div>
  
  return <div>Role: {member.role}</div>
}
```

## Files to Update

### Client Components (Components that use hooks)
- [ ] components/dashboard/DashboardContent.tsx
- [ ] components/dashboard/Sidebar.tsx  
- [ ] components/dashboard/TopBar.tsx
- [ ] components/dashboard/DashboardNav.tsx
- [ ] app/dashboard/*/page.tsx (various dashboard pages)

### Server Components (use server-side auth)
Server components should use:
```typescript
import { getAuthContext } from '@/lib/supabase/server'

export default async function ServerPage() {
  const authContext = await getAuthContext()
  
  if (!authContext) {
    redirect('/auth/signin')
  }
  
  return <div>Hello {authContext.user.email}</div>
}
```

## Quick Find & Replace

### Step 1: Import Changes
```bash
# Find all NextAuth imports
grep -r "from 'next-auth/react'" app/ components/

# Replace with Supabase imports (do manually, context-dependent)
```

### Step 2: Hook Changes
- `useSession()` → `useSupabaseSession()`
- `signOut()` from next-auth → `signOut()` from useSupabaseSession
- `signIn()` → use `supabase.auth.signInWithPassword()`

### Step 3: Session Field Changes
- `session.user` → `user`
- `session.user.name` → `user.user_metadata.name`
- `status === 'loading'` → `loading`

## Testing

After migration, test:
1. Sign in flow
2. Sign out flow
3. Protected pages (should redirect if not logged in)
4. User info display
5. Session persistence (refresh page)

---

**Status:** Migration guide complete  
**Created:** `hooks/useSupabaseSession.ts` - Supabase session hook  
**Next:** Update all client components to use new hook
