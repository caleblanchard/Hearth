# Pre-Deployment Checklist - Supabase Migration

**Date:** January 10, 2026  
**Status:** 171/172 API routes migrated (99.4%)  
**Critical Items Before Deployment:** 🔴 **8 items remaining**

---

## ✅ COMPLETED

### API Routes Migration
- ✅ **171 out of 172 routes migrated** to Supabase (99.4%)
  - Only `/api/auth/[...nextauth]/route.ts` remains (Next.js auth handler - does NOT need migration)
- ✅ All routes use `getAuthContext()` from Supabase
- ✅ All routes use data layer functions from `lib/data/`
- ✅ Parent permission checks implemented via `isParentInFamily()`
- ✅ Consistent error handling and audit logging

### Data Layer Modules
- ✅ **25 data modules created** in `lib/data/`:
  - families.ts, members.ts, chores.ts, credits.ts, kiosk.ts
  - meals.ts, recipes.ts, calendar.ts, communication.ts, routines.ts
  - todos.ts, screentime.ts, inventory.ts, maintenance.ts, transport.ts
  - documents.ts, pets.ts, medications.ts, health.ts, automation.ts
  - projects.ts, notifications.ts, shopping.ts, achievements.ts, leaderboard.ts

### Infrastructure
- ✅ Supabase client setup (`lib/supabase/server.ts`, `lib/supabase/client.ts`)
- ✅ Database migrations created and applied locally
- ✅ TypeScript types generated (`lib/database.types.ts`)
- ✅ RLS policies implemented
- ✅ Test infrastructure with Supabase mocks

---

## 🔴 CRITICAL - BEFORE DEPLOYMENT

### 1. Missing Data Layer Functions (HIGH PRIORITY)

Several API routes reference data layer functions that don't exist yet:

#### Financial Module - Missing Functions
**Location:** `lib/data/financial.ts` (needs to be created)

```typescript
// Missing from lib/data/financial.ts
export async function getFinancialAnalytics(familyId, memberId, filters)
export async function getFinancialTransactions(familyId, memberId, filters)
export async function getBudgets(familyId, memberId)
export async function createBudget(familyId, data)
export async function getSavingsGoals(familyId, memberId)
export async function createSavingsGoal(familyId, data)
```

**Referenced by:**
- `/api/financial/analytics/route.ts`
- `/api/financial/transactions/route.ts`
- `/api/financial/budgets/route.ts`
- `/api/financial/savings-goals/route.ts`

#### Guest Module - Missing Functions
**Location:** `lib/data/guests.ts` (needs to be created)

```typescript
// Missing from lib/data/guests.ts
export async function getGuestInvites(familyId)
export async function createGuestInvite(familyId, memberId, data)
export async function revokeGuestInvite(inviteId)
```

**Referenced by:**
- `/api/family/guests/route.ts`
- `/api/family/guests/invite/route.ts`
- `/api/family/guests/[id]/route.ts`

#### Reports Module - Missing Functions
**Location:** `lib/data/reports.ts` (needs to be created)

```typescript
// Missing from lib/data/reports.ts
export async function getFamilyReport(familyId, filters)
```

**Referenced by:**
- `/api/reports/family/route.ts`

#### Meals Module - Missing Functions
**Location:** `lib/data/meals.ts` (partially complete)

```typescript
// Missing from lib/data/meals.ts
export async function addDishToMealEntry(mealEntryId, data)
export async function updateDish(dishId, data)
export async function deleteDish(dishId)
export async function fixMealWeekStarts(familyId)
```

**Referenced by:**
- `/api/meals/plan/dishes/route.ts`
- `/api/meals/plan/dishes/[id]/route.ts`
- `/api/admin/fix-meal-week-starts/route.ts`

#### Recipes Module - Missing Functions
**Location:** `lib/data/recipes.ts` (partially complete)

```typescript
// Missing from lib/data/recipes.ts
export async function searchRecipes(familyId, query)
```

**Referenced by:**
- `/api/meals/recipes/search/route.ts`

#### Calendar Module - Missing Functions
**Location:** `lib/data/calendar.ts` (partially complete)

```typescript
// Missing from lib/data/calendar.ts
export async function getCalendarConnections(memberId)
export async function getCalendarConnection(connectionId)
export async function updateCalendarConnection(connectionId, data)
export async function deleteCalendarConnection(connectionId)
export async function getCalendarSubscriptions(familyId)
export async function createCalendarSubscription(familyId, memberId, data)
export async function getCalendarSubscription(subscriptionId)
export async function updateCalendarSubscription(subscriptionId, data)
export async function deleteCalendarSubscription(subscriptionId)
export async function syncCalendarSubscription(subscriptionId, familyId)
export async function testFetchCalendar(url)
export async function cleanupOldCalendarEvents(familyId)
export async function getCalendarDebugInfo(familyId)
export async function initiateGoogleCalendarConnect(memberId)
export async function handleGoogleCalendarCallback(memberId, code)
```

**Referenced by:**
- `/api/calendar/connections/route.ts`
- `/api/calendar/connections/[id]/route.ts`
- `/api/calendar/subscriptions/route.ts`
- `/api/calendar/subscriptions/[id]/route.ts`
- `/api/calendar/subscriptions/[id]/sync/route.ts`
- `/api/calendar/test-fetch/route.ts`
- `/api/calendar/cleanup-old-events/route.ts`
- `/api/calendar/debug/route.ts`
- `/api/calendar/google/connect/route.ts`
- `/api/calendar/google/callback/route.ts`

#### Documents Module - Missing Functions
**Location:** `lib/data/documents.ts` (partially complete)

```typescript
// Missing from lib/data/documents.ts
export async function createDocumentShareLink(documentId, memberId, data)
export async function revokeDocumentShareLink(linkId)
```

**Referenced by:**
- `/api/documents/[id]/share/route.ts`
- `/api/documents/share/[linkId]/revoke/route.ts`

#### Pets Module - Missing Functions
**Location:** `lib/data/pets.ts` (partially complete)

```typescript
// Missing from lib/data/pets.ts
export async function getPetMedications(petId)
export async function addPetMedication(petId, memberId, data)
export async function getPetWeights(petId)
export async function addPetWeight(petId, memberId, data)
export async function getPetVetVisits(petId)
export async function addPetVetVisit(petId, memberId, data)
```

**Referenced by:**
- `/api/pets/[id]/medications/route.ts`
- `/api/pets/[id]/weights/route.ts`
- `/api/pets/[id]/vet-visits/route.ts`

#### Health Module - Missing Functions
**Location:** `lib/data/health.ts` (partially complete)

```typescript
// Missing from lib/data/health.ts
export async function addMedicationToHealthEvent(eventId, memberId, data)
```

**Referenced by:**
- `/api/health/events/[id]/medications/route.ts`

#### Dashboard Module - Missing Functions
**Location:** `lib/data/dashboard.ts` (exists but may need validation)

#### Settings Module - Missing Functions
**Location:** `lib/data/settings.ts` (exists but may need validation)

#### Family Module - Missing Functions
**Location:** `lib/data/family.ts` (exists but may need validation)

#### Approvals Module - Missing Functions
**Location:** `lib/data/approvals.ts` (exists but may need validation)

---

### 2. Library Files Still Using Prisma (MEDIUM PRIORITY)

These library files still import `prisma` and will break at runtime:

```
lib/auth.ts                           - NextAuth config (will be replaced by Supabase Auth)
lib/rules-engine/index.ts             - Rules orchestrator
lib/rules-engine/triggers.ts          - Trigger evaluators
lib/rules-engine/actions.ts           - Action executors
lib/integrations/google-calendar.ts   - Google Calendar integration
lib/integrations/external-calendar.ts - External calendar integration
lib/guest-session.ts                  - Guest session validation
lib/kiosk-session.ts                  - Kiosk session management
lib/sick-mode.ts                      - Sick mode utilities
lib/screentime-utils.ts               - Screen time calculations
lib/screentime-grace.ts               - Grace period logic
lib/notifications.ts                  - Notification utilities
lib/push-notifications.ts             - Push notification sending
lib/achievements.ts                   - Achievement calculations
lib/module-protection.ts              - Module access control
lib/sample-data-generator.ts          - Test data generator (can stay as-is)
lib/examples/push-notification-example.ts - Example code (can stay as-is)
```

**Action Required:**
- Migrate these files to use Supabase client or data layer functions
- Priority: Rules engine, guest session, kiosk session, integrations

---

### 3. Page Components Using Old Auth (LOW PRIORITY)

These page components still import from `@/lib/auth`:

```
app/dashboard/page.tsx              - Dashboard landing page
app/dashboard/settings/kiosk/page.tsx - Kiosk settings page
app/kiosk/page.tsx                  - Kiosk mode page
app/page.tsx                        - Root landing page
```

**Action Required:**
- Update to use Supabase auth from `lib/auth/server.ts`
- Should use `getAuthContext()` for server components

---

### 4. Component Using Prisma

```
app/dashboard/meals/MealPlanner.tsx - Imports prisma directly
```

**Action Required:**
- Remove direct Prisma import
- Use API routes or client-side data fetching

---

## ⚠️ MEDIUM PRIORITY - BEFORE DEPLOYMENT

### 5. Manual Testing Required

Per the checklist, these items need manual testing:

- [ ] Full authentication flow (sign up, sign in, sign out)
- [ ] Kiosk mode flow (start session, unlock, lock, auto-lock)
- [ ] Guest session flow
- [ ] All major features work end-to-end
- [ ] RLS policies correctly restrict access
- [ ] OAuth integrations (Google Calendar)
- [ ] File uploads (if implemented)

### 6. Environment Variables

Ensure these are configured for production:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=

# OpenWeatherMap (for weather widget)
OPENWEATHER_API_KEY=

# Google Calendar OAuth (if used)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Push Notifications (if used)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

### 7. Database Migrations

- [ ] Create Supabase production project
- [ ] Apply all migrations to production database
- [ ] Verify RLS policies are enabled
- [ ] Test database connection from Vercel

### 8. Vercel Deployment Configuration

- [ ] Create Vercel project linked to repository
- [ ] Configure environment variables in Vercel
- [ ] Set up preview deployments for feature branches
- [ ] Configure custom domain (optional)

---

## 📊 SUMMARY

### Blocking Issues (Must Fix Before Deployment)
1. **Create missing data layer functions** (estimated 2-4 hours)
   - Financial module (6 functions)
   - Guest module (3 functions)
   - Reports module (1 function)
   - Meals module (4 functions)
   - Recipes module (1 function)
   - Calendar module (14 functions)
   - Documents module (2 functions)
   - Pets module (6 functions)
   - Health module (1 function)
   - **Total: ~38 functions across 9 modules**

2. **Migrate library files from Prisma to Supabase** (estimated 3-5 hours)
   - Rules engine (3 files) - HIGH PRIORITY
   - Guest/Kiosk sessions (2 files) - HIGH PRIORITY
   - Integrations (2 files) - MEDIUM PRIORITY
   - Utilities (7 files) - LOW PRIORITY

### Non-Blocking Issues (Can Fix After Initial Deployment)
3. Update page components to use Supabase auth (4 files)
4. Manual testing of all features
5. Production environment setup

---

## 🎯 RECOMMENDED NEXT STEPS

### Immediate (Before Deployment):
1. **Create all missing data layer functions** (highest priority)
2. **Migrate rules engine to Supabase** (prevents runtime errors)
3. **Migrate guest/kiosk session libraries** (prevents runtime errors)
4. **Basic manual testing** (auth, kiosk, main features)

### Short-term (First Week After Deployment):
5. Migrate remaining library utilities
6. Update page components
7. Comprehensive manual testing
8. Monitor production errors

### Long-term (Ongoing):
9. Remove Prisma dependencies completely
10. Remove NextAuth dependencies
11. Update all documentation
12. Celebrate! 🎉

---

## Estimated Time to Production Ready

- **Critical fixes (1-2):** 5-9 hours
- **Basic testing:** 2-3 hours
- **Deployment setup:** 1-2 hours
- **Total:** ~8-14 hours of focused work

---

**Last Updated:** January 10, 2026  
**Next Review:** After critical data layer functions are implemented
