# Mock Session Fix Summary

## Overview
Fixed incomplete mock session objects throughout the test suite that were causing TypeScript TS2322 errors. The issue was that tests were providing partial user objects when calling `mockChildSession()` and `mockParentSession()`, missing required properties like `role`, `familyId`, and `familyName`.

## Problem Description

### Root Cause
When tests used patterns like:
```typescript
mockChildSession({ user: { id: 'child-1' } })
mockParentSession({ user: { familyId: 'family-1' } })
```

TypeScript would report errors because the user object was missing required properties:
- `role: 'PARENT' | 'CHILD'`
- `familyId: string`
- `familyName: string`

While the mock functions in `/lib/test-utils/auth-mock.ts` do deep merge and fill in defaults, TypeScript's type checker doesn't recognize this at compile time.

## Solution Approach

### Strategy 1: Remove Unnecessary Overrides
For cases where tests were only overriding with values that matched or were similar to the defaults, we simply removed the override:

**Before:**
```typescript
const session = mockChildSession({ user: { id: 'child-1' } })
```

**After:**
```typescript
const session = mockChildSession()
```

The default session already provides sensible test values:
- Child: `id: 'child-test-123'`, `role: 'CHILD'`, `familyId: 'family-test-123'`, `familyName: 'Test Family'`
- Parent: `id: 'parent-test-123'`, `role: 'PARENT'`, `familyId: 'family-test-123'`, `familyName: 'Test Family'`

### Strategy 2: Complete the User Object
For cases where tests needed specific IDs or family IDs (like testing family isolation), we added the missing properties:

**Before:**
```typescript
const session = mockChildSession({
  user: {
    id: 'child-1',
    familyId: 'family-1',
    role: Role.CHILD,
  },
})
```

**After:**
```typescript
const session = mockChildSession({
  user: {
    id: 'child-1',
    familyId: 'family-1',
    role: Role.CHILD,
    familyName: 'Test Family',
  },
})
```

## Implementation

### Automated Script
Created `/scripts/fix-mock-sessions.js` that handles multiple patterns:

1. **Pattern 1**: `mockChildSession({ user: { id: 'x' } })` → `mockChildSession()`
2. **Pattern 1b**: `mockParentSession({ user: { id: 'x' } })` → `mockParentSession()`
3. **Pattern 2**: `mockParentSession({ user: { familyId: 'x' } })` → `mockParentSession()`
4. **Pattern 2b**: `mockChildSession({ user: { familyId: 'x' } })` → `mockChildSession()`
5. **Pattern 3**: `mockChildSession({ user: { id: 'x', familyId: 'y' } })` → `mockChildSession()`
6. **Pattern 3b**: Reversed order with `familyId` first
7. **Pattern 4**: `mockParentSession({ user: { id: 'x', familyId: 'y' } })` → `mockParentSession()`
8. **Pattern 4b**: Reversed order with `familyId` first
9. **Pattern 5**: Inline user objects with `id`, `familyId`, `role` → Add `familyName`
10. **Pattern 6**: Multiline user objects → Add `familyName` with proper indentation

### Manual Fixes
Two files had special patterns requiring manual fixes:
- `/Users/cblanchard/Repos/Hearth/__tests__/integration/sick-mode/notifications.test.ts`
- `/Users/cblanchard/Repos/Hearth/__tests__/integration/sick-mode/screentime-bonus.test.ts`

These files defined `const mockSession` at the module level (outside tests).

## Results

### Before Fix
- **121 TS2322 errors** related to incomplete user objects in mock sessions
- Tests were technically correct at runtime (due to deep merge) but TypeScript couldn't verify

### After Fix
- **0 TS2322 errors** related to mock sessions
- All mock session calls now have complete type information
- TypeScript can properly verify type safety

### Files Modified
- **22 test files** with mock session issues fixed
- **Script created**: `/scripts/fix-mock-sessions.js` for future similar issues

### Test Files Fixed
1. `__tests__/integration/api/achievements/route.test.ts`
2. `__tests__/integration/api/calendar/events/[id]/route.test.ts`
3. `__tests__/integration/api/chores/[id]/complete.test.ts`
4. `__tests__/integration/api/dashboard/layout.test.ts`
5. `__tests__/integration/api/dashboard/route.test.ts`
6. `__tests__/integration/api/notifications/[id]/route.test.ts`
7. `__tests__/integration/api/notifications/mark-all-read/route.test.ts`
8. `__tests__/integration/api/notifications/preferences/route.test.ts`
9. `__tests__/integration/api/notifications/route.test.ts`
10. `__tests__/integration/api/notifications/subscribe/route.test.ts`
11. `__tests__/integration/api/rewards/[id]/redeem.test.ts`
12. `__tests__/integration/api/screentime/history.test.ts`
13. `__tests__/integration/api/screentime/log.test.ts`
14. `__tests__/integration/api/screentime/stats/route.test.ts`
15. `__tests__/integration/api/shopping/items/[id]/route.test.ts`
16. `__tests__/integration/api/todos/[id]/route.test.ts`
17. `__tests__/integration/family-isolation.test.ts`
18. `__tests__/integration/race-conditions.test.ts`
19. `__tests__/integration/sick-mode/notifications.test.ts`
20. `__tests__/integration/sick-mode/screentime-bonus.test.ts`

## Mock Session Reference

### Default Child Session
```typescript
mockChildSession()
// Returns:
{
  user: {
    id: 'child-test-123',
    name: 'Test Child',
    email: null,
    role: 'CHILD',
    familyId: 'family-test-123',
    familyName: 'Test Family',
  },
  expires: '...',
}
```

### Default Parent Session
```typescript
mockParentSession()
// Returns:
{
  user: {
    id: 'parent-test-123',
    name: 'Test Parent',
    email: 'parent@test.com',
    role: 'PARENT',
    familyId: 'family-test-123',
    familyName: 'Test Family',
  },
  expires: '...',
}
```

### Custom Session (When Needed)
```typescript
// Only override when you need values different from defaults
mockChildSession({
  user: {
    id: 'specific-child-id',
    familyId: 'specific-family-id',
    role: 'CHILD',
    familyName: 'Specific Family',
    // All required properties must be provided when overriding
  },
})
```

## Best Practices

### When to Use Default Sessions
Use `mockChildSession()` or `mockParentSession()` without arguments when:
- You don't care about specific IDs
- You're testing single-family scenarios
- The test doesn't depend on specific user properties

### When to Override
Only provide overrides when:
- Testing family isolation (need specific `familyId` values)
- Testing specific user interactions (need specific `id` values)
- Testing role-specific logic with edge cases

**Important**: When overriding, always provide ALL required properties:
- `id: string`
- `role: 'PARENT' | 'CHILD'`
- `familyId: string`
- `familyName: string`

## Future Prevention

### Type Safety
The fix ensures TypeScript can properly validate mock session usage. Any future incomplete mock sessions will be caught at compile time.

### Script Availability
The `/scripts/fix-mock-sessions.js` script can be re-run if similar issues are introduced in new tests.

### Developer Guidelines
When writing new tests:
1. Prefer using `mockChildSession()` or `mockParentSession()` without arguments
2. Only add overrides when testing requires specific values
3. When overriding, always provide complete user objects with all required properties
4. Use the `Role` enum for type safety: `Role.CHILD` or `Role.PARENT`

## Remaining Issues

### Other TS2322 Errors
After fixing mock sessions, there are **15 remaining TS2322 errors** unrelated to mock sessions:
- 3 errors in Prisma transaction mocks
- 4 errors in screentime grace request tests (string vs null)
- 2 errors in data layer files (type mismatches)
- 2 errors in Supabase auth mocks
- 4 errors in other data files

These are separate issues that need individual attention.

---

**Date**: 2026-01-11
**Fixed By**: Automated script + manual edits
**TypeScript Errors Fixed**: 121 → 0 (for mock sessions)
