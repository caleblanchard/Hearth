# Sick Mode Feature Documentation

**Status:** ✅ Implemented (Backend API Complete)  
**Implementation Date:** 2026-01-07  
**Test Coverage:** 41 integration tests passing

---

## Overview

Sick Mode is a global family state feature that temporarily relaxes rules and expectations when a child is sick. It automatically adjusts chores, screen time, routines, and notifications across all modules to accommodate illness.

## Features

### Core Functionality

- **Manual Activation**: Parents can start sick mode for any family member; children can start it for themselves
- **Auto-Trigger**: Automatically starts when temperature exceeds threshold (default: 100.4°F)
- **Configurable Settings**: Family-wide preferences for how sick mode affects different modules
- **Instance Tracking**: Complete history of all sick mode sessions
- **Audit Logging**: Full audit trail of all sick mode actions

### API Endpoints

#### Start Sick Mode
```
POST /api/family/sick-mode/start
```

**Request Body:**
```json
{
  "memberId": "string (required)",
  "healthEventId": "string (optional)",
  "notes": "string (optional)"
}
```

**Response:**
```json
{
  "instance": {
    "id": "string",
    "familyId": "string",
    "memberId": "string",
    "startedAt": "datetime",
    "triggeredBy": "MANUAL | AUTO_FROM_HEALTH_EVENT",
    "isActive": true,
    "member": {
      "id": "string",
      "name": "string"
    }
  },
  "settings": {
    "pauseChores": true,
    "screenTimeBonus": 120,
    // ... other settings
  }
}
```

**Authorization:**
- Parents can start sick mode for any family member
- Children can only start sick mode for themselves

---

#### End Sick Mode
```
POST /api/family/sick-mode/end
```

**Request Body:**
```json
{
  "instanceId": "string (required)"
}
```

**Response:**
```json
{
  "instance": {
    "id": "string",
    "endedAt": "datetime",
    "endedById": "string",
    "isActive": false,
    "member": {
      "id": "string",
      "name": "string"
    }
  }
}
```

**Authorization:**
- Only parents can end sick mode

---

#### Get Status
```
GET /api/family/sick-mode/status
```

**Query Parameters:**
- `memberId` (optional): Filter by specific family member
- `includeEnded` (optional): Include ended instances (default: false)

**Response:**
```json
{
  "instances": [
    {
      "id": "string",
      "memberId": "string",
      "startedAt": "datetime",
      "endedAt": "datetime | null",
      "isActive": boolean,
      "triggeredBy": "MANUAL | AUTO_FROM_HEALTH_EVENT",
      "member": {
        "id": "string",
        "name": "string"
      }
    }
  ]
}
```

---

#### Get Settings
```
GET /api/family/sick-mode/settings
```

**Response:**
```json
{
  "settings": {
    "id": "string",
    "familyId": "string",
    "autoEnableOnTemperature": boolean,
    "temperatureThreshold": number,
    "autoDisableAfter24Hours": boolean,
    "pauseChores": boolean,
    "pauseScreenTimeTracking": boolean,
    "screenTimeBonus": number,
    "skipMorningRoutine": boolean,
    "skipBedtimeRoutine": boolean,
    "muteNonEssentialNotifs": boolean
  }
}
```

**Note:** If no settings exist for the family, default settings are automatically created.

---

#### Update Settings
```
PUT /api/family/sick-mode/settings
```

**Request Body:**
```json
{
  "autoEnableOnTemperature": boolean,
  "temperatureThreshold": number,
  "autoDisableAfter24Hours": boolean,
  "pauseChores": boolean,
  "pauseScreenTimeTracking": boolean,
  "screenTimeBonus": number,
  "skipMorningRoutine": boolean,
  "skipBedtimeRoutine": boolean,
  "muteNonEssentialNotifs": boolean
}
```

**Validation:**
- `temperatureThreshold` must be a positive number
- `screenTimeBonus` must be non-negative

**Authorization:**
- Only parents can update settings

**Response:**
```json
{
  "settings": {
    // Updated settings object
  }
}
```

---

## Configuration Options

| Setting | Default | Description |
|---------|---------|-------------|
| `autoEnableOnTemperature` | `true` | Automatically start sick mode when fever detected |
| `temperatureThreshold` | `100.4` | Temperature in Fahrenheit that triggers auto-start |
| `autoDisableAfter24Hours` | `false` | Automatically end sick mode after 24 hours |
| `pauseChores` | `true` | Pause assigned chores while sick |
| `pauseScreenTimeTracking` | `true` | Stop tracking screen time usage |
| `screenTimeBonus` | `120` | Extra screen time minutes granted (2 hours) |
| `skipMorningRoutine` | `true` | Skip morning checklist |
| `skipBedtimeRoutine` | `false` | Skip bedtime routine |
| `muteNonEssentialNotifs` | `true` | Reduce non-critical notifications |

---

## Auto-Trigger Integration

Sick mode can automatically activate when a high temperature is logged:

1. Parent or child logs a temperature via `/api/health/temperature`
2. System checks if `autoEnableOnTemperature` is enabled
3. If temperature ≥ `temperatureThreshold`:
   - Creates or finds an active illness health event
   - Starts sick mode linked to that health event
   - Sets `triggeredBy` to `AUTO_FROM_HEALTH_EVENT`
4. Response includes `sickModeTriggered: true`

**Prevention of Duplicates:**
- Won't auto-trigger if sick mode is already active for the member
- Won't create multiple health events if one is already active

---

## Database Schema

### SickModeInstance
```prisma
model SickModeInstance {
  id            String           @id @default(uuid())
  familyId      String
  memberId      String           // Who is sick
  startedAt     DateTime         @default(now())
  endedAt       DateTime?
  endedById     String?          // Who ended it
  triggeredBy   SickModeTrigger
  healthEventId String?          // Link to health event if auto-triggered
  notes         String?
  isActive      Boolean          @default(true)
  
  // Relations
  family      Family
  member      FamilyMember
  endedBy     FamilyMember?
  healthEvent HealthEvent?
}
```

### SickModeSettings
```prisma
model SickModeSettings {
  id                        String   @id @default(uuid())
  familyId                  String   @unique
  autoEnableOnTemperature   Boolean  @default(true)
  temperatureThreshold      Decimal  @default(100.4)
  autoDisableAfter24Hours   Boolean  @default(false)
  pauseChores               Boolean  @default(true)
  pauseScreenTimeTracking   Boolean  @default(true)
  screenTimeBonus           Int      @default(120)
  skipMorningRoutine        Boolean  @default(true)
  skipBedtimeRoutine        Boolean  @default(false)
  muteNonEssentialNotifs    Boolean  @default(true)
  
  // Relations
  family Family
}
```

---

## Test Coverage

### Start Endpoint (12 tests)
- ✅ Authentication checks
- ✅ Authorization (parent vs child permissions)
- ✅ Input validation
- ✅ Member existence verification
- ✅ Family isolation
- ✅ Conflict detection (already active)
- ✅ Health event linking
- ✅ Settings retrieval
- ✅ Default settings creation
- ✅ Audit logging

### End Endpoint (7 tests)
- ✅ Authentication checks
- ✅ Authorization (parents only)
- ✅ Instance validation
- ✅ Already ended detection
- ✅ Family isolation
- ✅ Audit logging

### Status Endpoint (6 tests)
- ✅ Authentication checks
- ✅ Active instance filtering
- ✅ Member filtering
- ✅ Include ended instances
- ✅ Empty results handling

### Settings Endpoints (12 tests)
- ✅ GET: Authentication
- ✅ GET: Default creation
- ✅ GET: Child access allowed
- ✅ PUT: Authentication
- ✅ PUT: Parent-only authorization
- ✅ PUT: Setting updates
- ✅ PUT: Creation if missing
- ✅ PUT: Temperature validation
- ✅ PUT: Screen time validation
- ✅ PUT: Audit logging

### Auto-Trigger (4 tests)
- ✅ Triggers when temp exceeds threshold
- ✅ Doesn't trigger below threshold
- ✅ Respects disabled setting
- ✅ Prevents duplicate activation

---

## Audit Events

All sick mode actions are logged:

- `SICK_MODE_STARTED` - When sick mode is activated
- `SICK_MODE_ENDED` - When sick mode is deactivated
- `SICK_MODE_SETTINGS_UPDATED` - When settings are changed
- `SICK_MODE_AUTO_TRIGGERED` - When auto-triggered by fever

Each audit log includes:
- Family ID
- Member who performed the action
- Entity type and ID
- Previous and new values (for updates)
- Metadata (e.g., sick member ID, temperature)

---

## Future Enhancements

### Module Integration (Not Yet Implemented)
- **Chores Module**: Check for active sick mode before assigning/requiring chores
- **Screen Time Module**: Apply bonus minutes and pause tracking when sick mode active
- **Routines Module**: Skip routines based on settings
- **Notifications Module**: Filter/mute non-essential notifications

### UI Components (Not Yet Implemented)
- Dashboard banner showing "Sick Mode Active for [Name]"
- Settings configuration page
- Quick-start button in health event views
- Visual indicators throughout the app

### Additional Features
- Auto-disable after 24 hours (setting exists, logic not implemented)
- Schedule-based auto-end
- Notification to parents when auto-triggered
- Analytics/reporting on sick mode usage

---

## Example Usage

### Manually Start Sick Mode
```typescript
const response = await fetch('/api/family/sick-mode/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    memberId: 'child-123',
    notes: 'Has a cold, staying home from school'
  })
});

const { instance, settings } = await response.json();
```

### Check Active Instances
```typescript
const response = await fetch('/api/family/sick-mode/status');
const { instances } = await response.json();

const activeSickMode = instances.find(i => i.isActive);
if (activeSickMode) {
  console.log(`${activeSickMode.member.name} is in sick mode`);
}
```

### Update Settings
```typescript
const response = await fetch('/api/family/sick-mode/settings', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    screenTimeBonus: 180, // 3 hours
    temperatureThreshold: 101.0
  })
});

const { settings } = await response.json();
```

---

## Migration

The Sick Mode feature was added via Prisma migration:
- Migration: `20260107030527_add_sick_mode_and_member_module_access`
- Database changes are backward compatible
- No data migration required

---

## Support

For questions or issues:
1. Check test files in `__tests__/integration/api/family/sick-mode/`
2. Review API implementation in `app/api/family/sick-mode/*/route.ts`
3. See auto-trigger logic in `app/api/health/temperature/route.ts`

---

## Implementation Status (2026-01-07)

### ✅ Completed Features

1. **Core API** - All 5 endpoints with 37 tests
   - Start, end, status, settings GET/PUT
   - Full validation and authorization
   
2. **Auto-Trigger** - Temperature-based activation (4 tests)
   - Integrates with health temperature logging
   - Creates/links health events automatically
   
3. **Module Integrations** - Chores, Screen Time, Routines
   - Helper library (`/lib/sick-mode.ts`) with 12 functions
   - Clean integration pattern with skip flags
   
4. **Notification Muting** - Smart filtering (28 tests)
   - Centralized helper (`/lib/notifications.ts`)
   - Essential vs non-essential classification
   - Automatic muting when setting enabled
   
5. **Screen Time Bonus** - Automatic calculation
   - Integrated into stats endpoint
   - Returns bonus and effective balance
   - Configurable per-family
   
6. **Auto-Disable Cron Job** - Hourly cleanup (5 tests)
   - Ends instances after configured duration
   - Multi-family support
   - Audit logging
   
7. **UI Components** - All integrated
   - Dashboard banner (DashboardContent)
   - Quick-start button (Health event page)
   - Settings page (/dashboard/settings/sick-mode)

### Test Breakdown

```
API Tests (41):
├── start endpoint       12 tests ✓
├── end endpoint          7 tests ✓
├── status endpoint       6 tests ✓
├── settings endpoint    12 tests ✓
└── temperature trigger   4 tests ✓

Integration Tests (33):
├── notifications        28 tests ✓
└── auto-disable          5 tests ✓

Total: 74+ tests passing
```

### API Endpoints Summary

| Endpoint | Method | Purpose | Auth | Tests |
|----------|--------|---------|------|-------|
| `/api/family/sick-mode/start` | POST | Start sick mode | Parent | 12 |
| `/api/family/sick-mode/end` | POST | End sick mode | Parent | 7 |
| `/api/family/sick-mode/status` | GET | Get active instances | Any | 6 |
| `/api/family/sick-mode/settings` | GET | Get settings | Any | 6 |
| `/api/family/sick-mode/settings` | PUT | Update settings | Parent | 6 |
| `/api/cron/sick-mode-auto-disable` | POST | Auto-disable job | Cron | 5 |

### Configuration Options

All 10 settings are implemented and functional:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `pauseChores` | Boolean | `true` | Skip chore assignments |
| `skipMorningRoutine` | Boolean | `false` | Skip morning routine |
| `skipBedtimeRoutine` | Boolean | `false` | Skip bedtime routine |
| `pauseScreenTimeTracking` | Boolean | `false` | Don't track usage |
| `screenTimeBonus` | Number | `0` | Extra minutes granted |
| `muteNonEssentialNotifs` | Boolean | `true` | Silence notifications |
| `autoEnableOnTemperature` | Boolean | `false` | Auto-start on fever |
| `temperatureThreshold` | Decimal | `100.4` | Fever threshold (°F) |
| `autoDisableAfterHours` | Number? | `null` | Auto-end duration |
| `requireParentApproval` | Boolean | `false` | Require approval to start |

### Production Deployment

**Prerequisites:**
1. Database migration applied (20260107030527)
2. Cron job configured for auto-disable
3. Environment variables (none required)

**Cron Configuration:**
```json
{
  "crons": [
    {
      "path": "/api/cron/sick-mode-auto-disable",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Monitoring:**
- Check audit logs for SICK_MODE_STARTED/ENDED actions
- Monitor cron job execution for auto-disable
- Track notification muting in logs (info level)

### Future Enhancements (Optional)

1. **Enhanced Notifications**
   - Send notification when sick mode auto-disables
   - Parent notification when auto-trigger activates

2. **Analytics**
   - Dashboard showing sick mode usage patterns
   - Health correlation analysis

3. **Wellness Features**
   - Medication reminders during sick mode
   - Hydration tracking integration
   - Sleep quality monitoring

---

**See Also:**
- [SICK_MODE_INTEGRATION.md](./SICK_MODE_INTEGRATION.md) - Developer integration guide
- [API Documentation](#api-endpoints) - Complete API reference above
