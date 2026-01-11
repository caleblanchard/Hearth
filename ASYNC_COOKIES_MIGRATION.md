# Next.js 15/16 Breaking Change: Async cookies()

## What Changed

In Next.js 15+, the `cookies()` function is now **async** and returns a Promise.

### Before (Next.js 14)
```typescript
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()  // Synchronous
  return createServerClient(...)
}
```

### After (Next.js 15/16)
```typescript
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()  // Async!
  return createServerClient(...)
}
```

## Files Updated

### ✅ Core Infrastructure
- `lib/supabase/server.ts` - Made `createClient()` async

### ✅ Data Layer (28 files)
All files in `lib/data/` updated to use `await createClient()`:
- families.ts, members.ts, chores.ts, credits.ts
- screentime.ts, shopping.ts, todos.ts, calendar.ts
- meals.ts, recipes.ts, routines.ts, communication.ts
- inventory.ts, maintenance.ts, transport.ts, pets.ts
- documents.ts, medications.ts, health.ts, projects.ts
- automation.ts, notifications.ts, achievements.ts
- leaderboard.ts, financial.ts, guests.ts, reports.ts, kiosk.ts

### ✅ API Routes (180+ files)
All API route handlers in `app/api/` updated

### ✅ Library Files
- lib/auth.ts
- lib/integrations/google-calendar.ts
- lib/integrations/external-calendar.ts
- lib/rules-engine/index.ts
- lib/screentime-grace.ts
- lib/screentime-utils.ts
- lib/push-notifications.ts

### ℹ️  Middleware
- `middleware.ts` - No changes needed (uses `request.cookies` not `cookies()`)

## Impact

All functions that call `createClient()` are already `async`, so the change was seamless:

```typescript
// Data layer functions are already async
export async function getFamily(familyId: string) {
  const supabase = await createClient()  // ✅ Works
  // ...
}

// API routes are already async
export async function GET(request: Request) {
  const supabase = await createClient()  // ✅ Works
  // ...
}
```

## Testing

After the changes:
- ✅ Dev server starts
- ✅ All API routes work
- ✅ Authentication works
- ✅ Database queries work

## Why This Change?

Next.js made `cookies()` async to support:
1. Better React Server Components integration
2. Improved streaming
3. Future optimizations
4. Consistency with other Next.js APIs

## References

- https://nextjs.org/docs/messages/sync-dynamic-apis
- https://nextjs.org/docs/app/api-reference/functions/cookies

---

**Status:** ✅ Fully migrated to Next.js 16 async cookies API  
**Date:** January 10, 2026
