# Bug Fix: Meal Planning Date/Timezone Issues

**Date**: 2026-01-06
**Status**: ✅ Fixed

## Issues Identified

### Issue 1: Meal Planner Dates Off by One Day
**Symptom**: The day-of-month numbers in the meal planner grid didn't match the correct day of the week. For example, Tuesday January 6th showed as the 5th.

**Root Cause**: The `getDateForDay` function and week navigation functions (`goToPreviousWeek`, `goToNextWeek`) used local time methods (`setDate`, `getDate`) while working with UTC date strings. This caused timezone offset issues, especially for users not in UTC timezone.

**Files Affected**:
- `app/dashboard/meals/MealPlanner.tsx`

**Fix Applied**:
Changed from local time methods to UTC methods:
```typescript
// OLD (BROKEN)
const getDateForDay = (dayIndex: number): string => {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + dayIndex);  // Local time
  return formatDate(date);
};

// NEW (FIXED)
const getDateForDay = (dayIndex: number): string => {
  const date = new Date(weekStart);
  date.setUTCDate(date.getUTCDate() + dayIndex);  // UTC time
  return formatDate(date);
};
```

Similar fixes applied to:
- `goToPreviousWeek()` - changed `setDate()` to `setUTCDate()`
- `goToNextWeek()` - changed `setDate()` to `setUTCDate()`

### Issue 2: Meals Not Appearing in Calendar
**Symptom**: Meals added to the meal planner didn't show up as events in the calendar view.

**Root Cause**: The `fetchMealEvents` function in the calendar was using local time methods (`setHours`) to set meal times, but the meal dates from the database are stored in UTC. This caused a date mismatch where meals appeared on the wrong day (often the previous day).

**Example**:
- Meal stored in DB: `2026-01-06T00:00:00.000Z` (Jan 6 UTC)
- Old code with `setHours(12, 0, 0, 0)` for lunch:
  - Result: `2026-01-05T17:00:00.000Z` (Jan 5 at 5pm UTC - wrong day!)
- Fixed code with `setUTCHours(12, 0, 0, 0)`:
  - Result: `2026-01-06T12:00:00.000Z` (Jan 6 at 12pm UTC - correct!)

**Files Affected**:
- `app/dashboard/calendar/page.tsx`

**Fix Applied**:
```typescript
// OLD (BROKEN)
const startTime = new Date(mealDate);
startTime.setHours(hour, 0, 0, 0);  // Local time

const endTime = new Date(startTime);
endTime.setHours(hour + duration, 0, 0, 0);  // Local time

// NEW (FIXED)
const startTime = new Date(mealDate);
startTime.setUTCHours(hour, 0, 0, 0);  // UTC time

const endTime = new Date(startTime);
endTime.setUTCHours(hour + duration, 0, 0, 0);  // UTC time
```

## Testing

Created test script to verify the fixes:
```javascript
// Test showed old implementation was setting meals to previous day
Old (setHours - local time):
  Start: 2026-01-05T17:00:00.000Z  // WRONG DAY!

Fixed (setUTCHours - UTC time):
  Start: 2026-01-06T12:00:00.000Z  // CORRECT!
```

## Verification

- [x] Production build successful
- [x] TypeScript compilation successful
- [x] Date calculations consistent with UTC storage
- [x] Calendar meal events now appear on correct dates
- [x] Meal planner grid shows correct day numbers

## Best Practice Learned

**Always use UTC methods when working with date-only values stored in the database:**
- Use `setUTCDate()`, `getUTCDate()`, `setUTCHours()`, `getUTCHours()`, etc.
- Avoid `setDate()`, `getDate()`, `setHours()`, `getHours()` which use local timezone
- This ensures consistent behavior regardless of user's timezone

The database stores dates as `YYYY-MM-DD 00:00:00 UTC`, so all date manipulation should be done in UTC to avoid timezone-related bugs.

## Impact

This fix resolves both reported issues:
1. ✅ Meal planner grid now shows correct dates matching day of week
2. ✅ Meals now appear in calendar on the correct dates
3. ✅ Week navigation works correctly across timezone boundaries

No database changes required - this was purely a client-side date handling issue.
