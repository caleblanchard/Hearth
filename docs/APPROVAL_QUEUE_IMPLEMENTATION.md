# Unified Parent Approval Queue - Implementation Plan

## Overview

Creating a centralized approval interface that aggregates all pending actions requiring parent review from across the system (chores, rewards, shopping, calendar).

**Status**: 🚧 In Progress - Phase 1 Complete  
**Started**: 2026-01-07  
**Priority**: Medium  

---

## Phase 1: Foundation ✅ COMPLETE

### Type Definitions Created
**File**: `/types/approvals.ts`

```typescript
export type ApprovalType = 
  | 'CHORE_COMPLETION' 
  | 'REWARD_REDEMPTION' 
  | 'SHOPPING_ITEM_REQUEST'
  | 'CALENDAR_EVENT_REQUEST';

export interface ApprovalItem {
  id: string;
  type: ApprovalType;
  familyMemberId: string;
  familyMemberName: string;
  familyMemberAvatarUrl?: string;
  title: string;
  description: string;
  requestedAt: Date;
  metadata: Record<string, any>;
  priority: ApprovalPriority;
}
```

### Test Suite Created
**File**: `/__tests__/integration/api/approvals/route.test.ts`

**Tests Written** (7 tests):
1. ✅ Should return 401 if not authenticated
2. ✅ Should return 403 if user is a child (parents only)
3. ✅ Should return empty array if no pending approvals
4. ✅ Should return pending chore completions
5. ✅ Should return pending reward redemptions
6. ✅ Should return mixed approval types sorted by date
7. ✅ Should filter approvals from other families

---

## Phase 2: Backend API Implementation (TODO)

### API Routes to Implement

#### 1. GET /api/approvals
**Purpose**: Return unified queue of all pending approvals

**Query Parameters**:
- `type` (optional): Filter by approval type
- `memberId` (optional): Filter by family member
- `sort` (optional): 'date' | 'priority' | 'type'
- `order` (optional): 'asc' | 'desc'

**Response**:
```json
{
  "approvals": [
    {
      "id": "chore-123",
      "type": "CHORE_COMPLETION",
      "familyMemberId": "child-1",
      "familyMemberName": "Alice",
      "title": "Clean Room",
      "description": "Completed on 2026-01-07",
      "requestedAt": "2026-01-07T10:00:00Z",
      "priority": "NORMAL",
      "metadata": {
        "credits": 10,
        "photoUrl": "/uploads/proof.jpg",
        "notes": "Cleaned everything!"
      }
    }
  ],
  "total": 1
}
```

**Implementation Strategy**:
1. Query `ChoreInstance` WHERE `status = 'COMPLETED'` AND `familyId = user.familyId`
2. Query `RewardRedemption` WHERE `status = 'PENDING'` AND `familyId = user.familyId`
3. Query `ShoppingItem` WHERE `status = 'PENDING'` AND `requestedBy IS NOT NULL`
4. Transform each to unified `ApprovalItem` format
5. Merge arrays, sort by `requestedAt`
6. Apply filters and pagination

#### 2. GET /api/approvals/stats
**Purpose**: Get count of pending approvals by type

**Response**:
```json
{
  "total": 15,
  "byType": {
    "choreCompletions": 8,
    "rewardRedemptions": 5,
    "shoppingRequests": 2,
    "calendarRequests": 0
  },
  "byPriority": {
    "high": 2,
    "normal": 11,
    "low": 2
  },
  "oldestPending": "2026-01-05T14:30:00Z"
}
```

#### 3. POST /api/approvals/bulk-approve
**Purpose**: Approve multiple items at once

**Request Body**:
```json
{
  "items": [
    { "id": "chore-123", "type": "CHORE_COMPLETION" },
    { "id": "redemption-456", "type": "REWARD_REDEMPTION" }
  ]
}
```

**Implementation**:
- For each item, call existing approval endpoints:
  - `CHORE_COMPLETION` → POST `/api/chores/[id]/approve`
  - `REWARD_REDEMPTION` → POST `/api/rewards/redemptions/[id]/approve`
- Collect successes and failures
- Return summary

#### 4. POST /api/approvals/bulk-deny
**Purpose**: Deny multiple items at once

**Request Body**:
```json
{
  "items": [
    { "id": "chore-789", "type": "CHORE_COMPLETION" }
  ],
  "reason": "Does not meet standards"
}
```

---

## Phase 3: UI Components (TODO)

### 1. Approval Card Component
**File**: `/components/approvals/ApprovalCard.tsx`

**Features**:
- Display based on approval type (different layouts for chores vs rewards)
- Show child name and avatar
- Display timestamp ("2 hours ago")
- Quick approve/deny buttons
- Expandable details section
- Photo preview for chores
- Credit amount for rewards

**Example**:
```tsx
<ApprovalCard
  approval={approval}
  onApprove={handleApprove}
  onDeny={handleDeny}
/>
```

### 2. Approvals Page
**File**: `/app/dashboard/approvals/page.tsx`

**Layout**:
```
┌────────────────────────────────────┐
│  Approval Queue (15 pending)        │
├────────────────────────────────────┤
│  [Filter: All Types ▼] [Sort: Date]│
│  [x] Select All  [Approve] [Deny]  │
├────────────────────────────────────┤
│  ☐ Alice - Clean Room              │
│     Chore • 2 hours ago • 10 credits│
├────────────────────────────────────┤
│  ☐ Bob - Ice Cream Trip            │
│     Reward • 1 hour ago • 50 credits│
├────────────────────────────────────┤
│  ... more items ...                │
└────────────────────────────────────┘
```

**Features**:
- Filter dropdown (All, Chores, Rewards, Shopping)
- Sort dropdown (Date, Priority, Type, Member)
- Bulk select checkboxes
- Bulk action toolbar
- Empty state ("No pending approvals! 🎉")
- Loading skeleton
- Infinite scroll or pagination

### 3. Dashboard Widget
**File**: `/components/dashboard/widgets/ApprovalsWidget.tsx`

**Display**:
```
┌─────────────────────┐
│ Pending Approvals   │
│  ┌─────────────┐    │
│  │     15      │    │
│  │  Items      │    │
│  └─────────────┘    │
│  [View Queue →]     │
└─────────────────────┘
```

**Badge on Sidebar**:
- Show red badge with count next to "Approvals" menu item
- Update in real-time when new approvals come in

---

## Database Strategy

### No New Tables Needed! ✅

The unified approval queue aggregates from existing tables:

1. **Chore Completions**: `ChoreInstance`
   - WHERE `status = 'COMPLETED'`
   - Joined with `ChoreSchedule`, `ChoreDefinition`, `FamilyMember`

2. **Reward Redemptions**: `RewardRedemption`
   - WHERE `status = 'PENDING'`
   - Joined with `RewardItem`, `FamilyMember`

3. **Shopping Requests**: `ShoppingItem`
   - WHERE `status = 'PENDING'` AND `requestedById IS NOT NULL`
   - Joined with `FamilyMember`

4. **Calendar Requests**: `CalendarEvent` (future)
   - WHERE `requiresApproval = true` AND `approved = false`

---

## Testing Strategy

### Integration Tests
- [x] GET /api/approvals - basic functionality (7 tests written)
- [ ] GET /api/approvals - filtering and sorting
- [ ] GET /api/approvals/stats
- [ ] POST /api/approvals/bulk-approve
- [ ] POST /api/approvals/bulk-deny
- [ ] Error handling

### Component Tests
- [ ] ApprovalCard component
- [ ] Approvals page
- [ ] Dashboard widget

**Target**: 20+ tests total

---

## Priority Calculation Logic

```typescript
function calculatePriority(approval: any): ApprovalPriority {
  // High priority if:
  // - Chore with photo proof (child put effort in)
  // - Reward costing >100 credits (significant request)
  // - Waiting >24 hours
  
  if (approval.type === 'CHORE_COMPLETION' && approval.photoUrl) {
    return 'HIGH';
  }
  
  if (approval.type === 'REWARD_REDEMPTION' && approval.creditCost > 100) {
    return 'HIGH';
  }
  
  const hoursPending = (Date.now() - approval.requestedAt.getTime()) / (1000 * 60 * 60);
  if (hoursPending > 24) {
    return 'HIGH';
  }
  
  if (hoursPending > 12) {
    return 'NORMAL';
  }
  
  return 'LOW';
}
```

---

## User Stories

### Story 1: Parent Views Queue
**As a parent**, I want to see all pending approvals in one place, so I don't have to check multiple pages.

**Acceptance Criteria**:
- ✅ Can access unified queue from dashboard
- ✅ See chore completions and reward redemptions together
- ✅ Items sorted by oldest first by default
- ✅ Can filter by type or family member

### Story 2: Bulk Approval
**As a parent**, I want to approve multiple items at once, so I can quickly clear the queue.

**Acceptance Criteria**:
- Can select multiple items via checkboxes
- "Approve All" button processes all selected
- Shows progress indicator during bulk operation
- Displays success count

### Story 3: Quick Actions
**As a parent**, I want to approve/deny from the card without opening details, so I can work efficiently.

**Acceptance Criteria**:
- Approve button visible on each card
- Deny button with reason prompt
- Optimistic UI updates
- Toast notifications for actions

---

## Implementation Timeline

**Estimated Time**: 6-8 hours

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Type definitions | 30 min | ✅ Done |
| 1 | Test suite setup | 1 hour | ✅ Done |
| 2 | GET /api/approvals | 2 hours | ⏳ Next |
| 2 | Stats & bulk endpoints | 1.5 hours | ⏳ Pending |
| 3 | ApprovalCard component | 1 hour | ⏳ Pending |
| 3 | Approvals page | 2 hours | ⏳ Pending |
| 3 | Dashboard widget | 1 hour | ⏳ Pending |
| 4 | Testing & polish | 1 hour | ⏳ Pending |

---

## Next Steps

1. ✅ Create type definitions
2. ✅ Write test suite for GET /api/approvals
3. ⏳ **NEXT**: Implement GET /api/approvals route
4. Run tests and verify
5. Implement stats endpoint
6. Implement bulk approve/deny
7. Create UI components
8. Manual testing
9. Documentation

---

## Notes

- Uses existing approval mechanisms (no changes to chore/reward flows)
- Parent-only feature (children can't approve)
- Real-time updates possible via polling or WebSockets
- Can add push notifications for new approvals
- Extensible to future approval types (calendar, documents, etc.)

---

**Last Updated**: 2026-01-07  
**Status**: Phase 1 complete, ready to implement API routes  
**Test Coverage**: 7 tests written, 0 passing (no implementation yet)
