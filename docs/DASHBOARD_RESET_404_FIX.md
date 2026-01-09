# Fix: 404 Error on Reset Dashboard Layout

## Issue

**Error**: `POST http://localhost:3000/api/dashboard/layout/reset 404 (Not Found)`

User clicked "Reset to Default" button and got a 404 error.

---

## Root Cause

The POST handler for the reset functionality was incorrectly placed in `/app/api/dashboard/layout/route.ts`. 

In Next.js App Router, you cannot have multiple HTTP methods with different paths in the same route file. The structure was:

```
/app/api/dashboard/layout/route.ts
  - GET /api/dashboard/layout ✅
  - PUT /api/dashboard/layout ✅
  - POST /api/dashboard/layout ❌ (should be /reset)
```

The POST was trying to handle `/api/dashboard/layout/reset`, but Next.js routes don't work that way.

---

## Solution

Created a separate route file for the reset endpoint:

```
/app/api/dashboard/layout/reset/route.ts
  - POST /api/dashboard/layout/reset ✅
```

**New File Structure:**
```
app/api/dashboard/
├── layout/
│   ├── route.ts          (GET, PUT)
│   └── reset/
│       └── route.ts      (POST)
```

---

## Files Modified

### 1. Created: `app/api/dashboard/layout/reset/route.ts` ✅

New file with the POST handler for resetting dashboard layout.

**Endpoint**: `POST /api/dashboard/layout/reset`

**Functionality**:
- Deletes user's saved layout from database
- Fetches enabled modules
- Generates fresh default layout
- Returns layout with all widgets visible

### 2. Modified: `app/api/dashboard/layout/route.ts` ✅

Removed the POST handler (moved to reset/route.ts).

Now only contains:
- `GET` - Fetch user's layout
- `PUT` - Save user's layout

### 3. Modified: `__tests__/integration/api/dashboard/layout.test.ts` ✅

Updated import to get POST from the correct location:

**Before:**
```typescript
import { GET, PUT, POST } from '@/app/api/dashboard/layout/route';
```

**After:**
```typescript
import { GET, PUT } from '@/app/api/dashboard/layout/route';
import { POST } from '@/app/api/dashboard/layout/reset/route';
```

---

## Testing

✅ All 12 API tests passing  
✅ Build successful  
✅ No TypeScript errors  

**Test Results:**
```
POST /reset
  ✓ should return 401 if not authenticated
  ✓ should delete user layout and return default
  ✓ should succeed even if no layout exists
```

---

## How It Works Now

### Reset Flow:

1. User clicks "Reset to Default" in customizer
2. Confirm dialog appears
3. On confirmation:
   ```javascript
   POST /api/dashboard/layout/reset
   ```
4. Server:
   - Deletes saved layout from `dashboard_layouts` table
   - Fetches all enabled modules for the family
   - Generates default layout with all 14 widgets visible
   - Returns new layout
5. Customizer updates with fresh layout
6. Modal closes, dashboard shows all widgets

---

## User Impact

**Before Fix**: ❌ 404 error, reset button didn't work  
**After Fix**: ✅ Reset works perfectly, all widgets become visible

---

## Next.js App Router Lesson

In Next.js 13+ App Router:
- Each folder under `/app/api/` represents a route segment
- `route.ts` files export HTTP method handlers (GET, PUT, POST, DELETE, etc.)
- Each `route.ts` handles ONE path
- For sub-paths like `/reset`, create a subfolder with its own `route.ts`

**Correct Structure:**
```
/app/api/dashboard/layout/route.ts       → /api/dashboard/layout
/app/api/dashboard/layout/reset/route.ts → /api/dashboard/layout/reset
```

**Incorrect (doesn't work):**
```
/app/api/dashboard/layout/route.ts       → both /api/dashboard/layout AND /api/dashboard/layout/reset
```

---

## Summary

✅ **Issue**: 404 on reset endpoint  
✅ **Cause**: POST handler in wrong route file  
✅ **Fix**: Created separate `/reset/route.ts` file  
✅ **Tests**: All passing  
✅ **Build**: Successful  
✅ **Status**: Deployed and working  

**User can now successfully reset their dashboard layout!**

