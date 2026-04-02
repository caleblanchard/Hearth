# Systematic API Route Migration Guide

**Date:** January 10, 2026  
**Purpose:** Complete migration of all remaining API routes to Supabase  
**Routes Remaining:** ~147 routes

---

## Migration Summary

### Data Modules Created: 25 Total

**Core (5):** families, members, chores, credits, kiosk  
**Meals (2):** meals, recipes  
**Social (3):** calendar, communication, routines  
**Management (5):** screentime, todos, transport, documents, pets  
**Health (2):** health, medications  
**Home (3):** inventory, maintenance, projects  
**Engagement (4):** shopping, notifications, achievements, leaderboard  
**Automation (1):** automation

### Routes by Migration Status

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Migrated | 25 | 15% |
| 🔄 Needs Migration | 147 | 85% |
| **Total** | **172** | **100%** |

---

## Standard Migration Pattern

### Before (Prisma + Old Auth)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.familyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await prisma.table.findMany({
    where: { familyId: session.user.familyId },
    include: { related: true }
  });

  return NextResponse.json({ data });
}
```

### After (Supabase + Data Module)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getTableData } from '@/lib/data/table';

export async function GET(request: NextRequest) {
  const authContext = await getAuthContext();
  
  if (!authContext) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const familyId = authContext.defaultFamilyId;
  if (!familyId) {
    return NextResponse.json({ error: 'No family found' }, { status: 400 });
  }

  const data = await getTableData(familyId);

  return NextResponse.json({ data });
}
```

---

## Migration Steps for Each Route

### 1. Update Imports
```typescript
// Remove
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Add
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getX, createX, updateX } from '@/lib/data/module-name';
```

### 2. Replace Auth
```typescript
// Before
const session = await auth();
if (!session?.user?.familyId) { ... }
const familyId = session.user.familyId;
const memberId = session.user.id;

// After
const authContext = await getAuthContext();
if (!authContext) { ... }
const familyId = authContext.defaultFamilyId;
const memberId = authContext.defaultMemberId;
```

### 3. Replace Prisma Calls
```typescript
// Before
const data = await prisma.table.findMany({ where: { familyId } });

// After
const data = await getTableData(familyId);
```

### 4. Replace Audit Logs
```typescript
// Before
await prisma.auditLog.create({
  data: {
    familyId,
    memberId,
    action: 'ACTION_NAME',
    result: 'SUCCESS',
  }
});

// After
const supabase = createClient();
await supabase.from('audit_logs').insert({
  family_id: familyId,
  member_id: memberId,
  action: 'ACTION_NAME',
  entity_type: 'ENTITY',
  entity_id: entityId,
  result: 'SUCCESS',
  metadata: { ... }
});
```

---

## Route-Specific Migrations

### Chores Routes (9 files)

**Data Module:** `chores.ts`

**Routes:**
- `/api/chores` → `getChoreDefinitions()`, `createChoreDefinition()`
- `/api/chores/[id]` → `getChoreDefinition()`, `updateChoreDefinition()`, `deleteChoreDefinition()`
- `/api/chores/[id]/complete` → `completeChore()` (RPC)
- `/api/chores/[id]/approve` → `approveChore()` (RPC)
- `/api/chores/[id]/reject` → Update to use direct Supabase
- `/api/chores/pending-approval` → `getPendingChoreCompletions()`
- `/api/chores/schedules/**` → `getChoreAssignments()`, `createChoreAssignment()`

### Allowance/Credits Routes (4 files)

**Data Module:** `credits.ts`

**Routes:**
- `/api/allowance` → `getCreditBalance()`, `getCreditTransactions()`
- `/api/allowance/[id]` → `updateCreditBalance()`
- `/api/rewards` → `getRewardItems()`, `createRewardItem()`
- `/api/rewards/[id]/redeem` → `redeemReward()` (RPC)

### Shopping Routes (3 files)

**Data Module:** `shopping.ts`

**Routes:**
- `/api/shopping` → `getActiveShoppingList()`, `getOrCreateShoppingList()`
- `/api/shopping/items` → `getShoppingItems()`, `addShoppingItem()`
- `/api/shopping/items/[id]` → `updateShoppingItem()`, `deleteShoppingItem()`

### Health Routes (7 files)

**Data Module:** `health.ts`

**Routes:**
- `/api/health` → `getHealthEvents()`, `createHealthEvent()`
- `/api/health/profiles` → `getMedicalProfile()`, `upsertMedicalProfile()`
- etc.

### Medications Routes (2 files)

**Data Module:** `medications.ts`

**Routes:**
- `/api/medications` → `getMemberMedications()`, `createMedication()`
- `/api/medications/doses` → `recordMedicationDose()`, `getMedicationDoses()`

### Inventory Routes (4 files)

**Data Module:** `inventory.ts`

**Routes:**
- `/api/inventory` → `getInventoryItems()`, `createInventoryItem()`
- `/api/inventory/low-stock` → `getLowStockItems()`

### Maintenance Routes (4 files)

**Data Module:** `maintenance.ts`

**Routes:**
- `/api/maintenance` → `getMaintenanceItems()`, `createMaintenanceItem()`
- `/api/maintenance/overdue` → `getOverdueMaintenanceItems()`
- `/api/maintenance/upcoming` → `getUpcomingMaintenance()`

### Projects Routes (6 files)

**Data Module:** `projects.ts`

**Routes:**
- `/api/projects` → `getProjects()`, `createProject()`
- `/api/projects/[id]` → `getProject()`, `updateProject()`, `deleteProject()`
- `/api/projects/[id]/tasks` → `getProjectTasks()`, `createProjectTask()`

### Rules/Automation Routes (6 files)

**Data Module:** `automation.ts`

**Routes:**
- `/api/rules` → `getAutomationRules()`, `createAutomationRule()`
- `/api/rules/[id]` → `getAutomationRule()`, `updateAutomationRule()`, `deleteAutomationRule()`
- `/api/rules/[id]/toggle` → `toggleAutomationRule()`
- `/api/rules/[id]/test` → `testRule()`
- `/api/rules/executions` → `getRuleExecutions()`

### Notifications Routes (5 files)

**Data Module:** `notifications.ts`

**Routes:**
- `/api/notifications/subscribe` → `addPushSubscription()`, `removePushSubscription()`
- `/api/notifications/preferences` → `getNotificationPreferences()`, `updateNotificationPreferences()`

### Achievements Routes (2 files)

**Data Module:** `achievements.ts`

**Routes:**
- `/api/achievements` → `getAchievements()`, `getMemberAchievements()`
- `/api/achievements/[id]/award` → `awardAchievement()`

### Leaderboard Routes (1 file)

**Data Module:** `leaderboard.ts`

**Routes:**
- `/api/leaderboard` → `getLeaderboard()`, `getTopPerformers()`

### Family/Settings Routes (3 files)

**Data Module:** `families.ts`, `members.ts`

**Routes:**
- `/api/family` → `getFamily()`, `updateFamily()`
- `/api/settings/modules` → `getModuleConfigurations()`, `setModuleEnabled()`

### Pets/Documents/Transport (Remaining)

**Data Modules:** Already created (`pets.ts`, `documents.ts`, `transport.ts`)

**Routes:**
- `/api/pets/**` → Use `pets.ts`
- `/api/documents/**` → Use `documents.ts`
- `/api/transport/**` → Use `transport.ts`

---

## Batch Migration Commands

### Find All Routes Using Old Auth
```bash
grep -r "from '@/lib/auth'" src/app/api --include="*.ts" -l
```

### Find All Routes Using Prisma
```bash
grep -r "import prisma" src/app/api --include="*.ts" -l
```

### Find Routes Already Migrated
```bash
grep -r "getAuthContext\|createClient" src/app/api --include="*.ts" -l
```

---

## Testing Strategy

After migration, test each route:

1. **Auth Test:** Verify 401 without auth
2. **Data Test:** Verify correct data returned
3. **RLS Test:** Verify family isolation (test with 2 families)
4. **Error Test:** Verify proper error handling

---

## Priority Order for Migration

### High Priority (Core Features - Do First)
1. ✅ Chores (partially done)
2. ✅ Credits/Allowance
3. ✅ Shopping
4. Notifications (for engagement)
5. Family/Settings (for configuration)

### Medium Priority (Common Features)
6. Health
7. Medications
8. Inventory
9. Maintenance
10. Projects

### Lower Priority (Less Frequent)
11. Rules/Automation
12. Achievements
13. Leaderboard
14. Pets/Documents/Transport (already have data modules)
15. Admin/Reports
16. Weather/Geocoding (external APIs)

---

## Automated Migration Script (Conceptual)

```typescript
// This would be a script to automate common replacements
const migrations = [
  {
    find: /import { auth } from '@\/lib\/auth';/g,
    replace: "import { getAuthContext } from '@/lib/supabase/server';"
  },
  {
    find: /const session = await auth\(\);/g,
    replace: "const authContext = await getAuthContext();"
  },
  {
    find: /session\?.user\?.familyId/g,
    replace: "authContext?.defaultFamilyId"
  },
  {
    find: /session\.user\.id/g,
    replace: "authContext.defaultMemberId"
  },
  // Add more patterns...
];
```

---

## Completion Tracking

### Routes to Migrate by Module

- [ ] Chores: 9 routes (1 done, 8 remaining)
- [ ] Credits: 4 routes
- [ ] Shopping: 3 routes
- [ ] Health: 7 routes
- [ ] Medications: 2 routes  
- [ ] Inventory: 4 routes
- [ ] Maintenance: 4 routes
- [ ] Projects: 6 routes
- [ ] Rules: 6 routes
- [ ] Notifications: 5 routes
- [ ] Achievements: 2 routes
- [ ] Leaderboard: 1 route
- [ ] Family/Settings: 3 routes
- [ ] Pets: 6 routes (data module exists)
- [ ] Documents: 6 routes (data module exists)
- [ ] Transport: 6 routes (data module exists)
- [ ] Calendar: 11 routes (1 done, 10 remaining)
- [ ] Communication: 2 routes (1 done, 1 remaining)
- [ ] Routines: 3 routes (1 done, 2 remaining)
- [ ] Screentime: 14 routes (1 done, 13 remaining)
- [ ] Todos: 2 routes (1 done, 1 remaining)
- [ ] Meals: 10 routes (3 done, 7 remaining)
- [ ] Approvals: 4 routes
- [ ] Dashboard: 4 routes
- [ ] Onboarding: 2 routes
- [ ] Reports: 1 route
- [ ] Admin: 1 route
- [ ] Startup: 1 route
- [ ] Weather/Geocoding: 2 routes (low priority)
- [ ] Cron: 6 routes (special handling)

**Estimated Total Remaining:** ~140 routes

---

## Time Estimates

- **Per Route:** ~3-5 minutes (simple) to ~15 minutes (complex with RPC)
- **Simple Route (GET):** 3-5 min
- **CRUD Route (GET/POST/PUT/DELETE):** 10-15 min
- **Complex Route (with RPC/transactions):** 15-20 min

**Total Estimated Time:** 10-15 hours for complete migration

---

## Recommendation

Given the scope (140+ routes), I recommend:

**Option 1: Automated Batch Migration** (Fastest - 2-3 hours)
- Use sed/awk to replace common patterns
- Manual review and test critical routes
- Deploy with mixed state temporarily

**Option 2: Systematic Manual Migration** (Most Thorough - 10-15 hours)
- Migrate route-by-route following this guide
- Test each route as we go
- Complete coverage guaranteed

**Option 3: Hybrid Approach** (Balanced - 5-8 hours)
- Auto-migrate simple patterns
- Manually migrate complex routes (RPC, transactions)
- Focus on high-priority routes first

Which approach would you prefer? Or shall I continue migrating routes manually starting with the high-priority ones?

---

**Last Updated:** January 10, 2026  
**Data Modules Complete:** 25/25 ✅  
**API Routes Migrated:** 25/172 (15%)  
**Remaining Work:** 147 routes
