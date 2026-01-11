# Data Module Quick Reference

**Purpose:** Quick reference for using Hearth's Supabase data modules  
**Updated:** January 10, 2026

---

## Import Patterns

```typescript
// Import specific functions
import { getRecipes, createRecipe } from '@/lib/data/recipes'
import { getCalendarEvents } from '@/lib/data/calendar'
import { getCommunicationPosts } from '@/lib/data/communication'

// Use in API routes or Server Components
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const recipes = await getRecipes(familyId)
  return NextResponse.json(recipes)
}
```

---

## Common Operations by Feature

### Family & Members
```typescript
import { getFamily, getFamilyWithMembers } from '@/lib/data/families'
import { getMember, setMemberPin, verifyMemberPin } from '@/lib/data/members'

// Get family with all members
const family = await getFamilyWithMembers(familyId)

// Set/verify PIN for kiosk mode
await setMemberPin(memberId, '1234')
const isValid = await verifyMemberPin(memberId, '1234')
```

### Chores & Credits
```typescript
import { getChoreDefinitions, completeChore } from '@/lib/data/chores'
import { getCreditBalance, redeemReward } from '@/lib/data/credits'

// Get chores with assignments
const chores = await getChoreDefinitions(familyId)

// Complete chore (RPC - atomic with credit award)
const result = await completeChore(assignmentId, memberId, notes)

// Get credit balance
const balance = await getCreditBalance(memberId)

// Redeem reward (RPC - atomic with credit deduction)
const redemption = await redeemReward(rewardId, memberId)
```

### Meal Planning
```typescript
import { getOrCreateMealPlan, getMealPlanWithEntries } from '@/lib/data/meals'
import { getRecipes, rateRecipe, addFavoriteRecipe } from '@/lib/data/recipes'

// Get meal plan for week
const mealPlan = await getMealPlanWithEntries(familyId, '2026-01-13')

// Get recipes with filters
const recipes = await getRecipes(familyId, {
  category: 'DINNER',
  dietaryTags: ['VEGETARIAN'],
  searchQuery: 'pasta'
})

// Rate a recipe
await rateRecipe({
  recipe_id: recipeId,
  member_id: memberId,
  rating: 5,
  comment: 'Delicious!'
})

// Add to favorites
await addFavoriteRecipe(memberId, recipeId)
```

### Calendar
```typescript
import { getCalendarEvents, createCalendarEvent, getTodayEvents } from '@/lib/data/calendar'

// Get events for date range
const events = await getCalendarEvents(familyId, startDate, endDate)

// Get today's events
const today = await getTodayEvents(familyId)

// Create event with assignments
const event = await createCalendarEvent({
  family_id: familyId,
  title: 'Soccer Practice',
  start_time: '2026-01-15T15:00:00Z',
  end_time: '2026-01-15T16:30:00Z',
  event_type: 'ACTIVITY',
  created_by_id: memberId
})

await assignMembersToEvent(event.id, [childId1, childId2])
```

### Communication
```typescript
import { getCommunicationPosts, createCommunicationPost, addPostReaction } from '@/lib/data/communication'

// Get posts with reactions
const posts = await getCommunicationPosts(familyId, { limit: 20 })

// Create post
const post = await createCommunicationPost({
  family_id: familyId,
  author_id: memberId,
  content: 'Pizza night tomorrow!',
  category: 'ANNOUNCEMENT'
})

// Add reaction
await addPostReaction(post.id, memberId, 'LOVE')
```

### Routines
```typescript
import { getMemberRoutines, completeRoutine, wasRoutineCompletedToday } from '@/lib/data/routines'

// Get morning routine
const routines = await getMemberRoutines(memberId)

// Check if completed today
const completed = await wasRoutineCompletedToday(routineId, memberId)

// Mark as completed
await completeRoutine(routineId, memberId, [itemId1, itemId2, itemId3])
```

### Screen Time
```typescript
import { getMemberAllowances, startScreenTimeSession, endScreenTimeSession } from '@/lib/data/screentime'

// Get allowances
const allowances = await getMemberAllowances(memberId)

// Start session
const session = await startScreenTimeSession({
  allowance_id: allowanceId,
  device_type: 'TABLET'
})

// End session (auto-deducts from allowance)
await endScreenTimeSession(session.id)

// Request grace period
await requestGracePeriod(allowanceId, memberId, 15, 'Homework project')
```

### Todos
```typescript
import { getTodoItems, createTodoItem, completeTodoItem } from '@/lib/data/todos'

// Get member's todos
const todos = await getTodoItems(familyId, { 
  assignedTo: memberId,
  status: 'pending'
})

// Create todo
const todo = await createTodoItem({
  family_id: familyId,
  title: 'Clean bedroom',
  assigned_to: memberId,
  due_date: '2026-01-15',
  priority: 'HIGH',
  created_by: parentId
})

// Complete todo
await completeTodoItem(todo.id, memberId)
```

### Kiosk Mode
```typescript
import { createKioskSession, unlockKioskSession, lockKioskSession } from '@/lib/data/kiosk'

// Start kiosk (parent only)
const session = await createKioskSession('device-123', familyId)

// Unlock with PIN
const result = await unlockKioskSession(session.session_token, memberId, '1234')

// Lock kiosk
await lockKioskSession(session.session_token)
```

---

## Query Patterns

### Get All (with Filters)
```typescript
const items = await getXs(familyId, {
  status: 'active',
  category: 'TYPE',
  limit: 20
})
```

### Get One
```typescript
const item = await getX(itemId)
```

### Create
```typescript
const newItem = await createX({
  family_id: familyId,
  name: 'New Item',
  // ... other fields
})
```

### Update
```typescript
const updated = await updateX(itemId, {
  name: 'Updated Name',
  // Only include fields to update
})
```

### Delete (Soft)
```typescript
await deleteX(itemId)
// Sets is_active = false
```

### Statistics
```typescript
const stats = await getXStats(id, startDate, endDate)
// Returns: { total, completed, rate, ... }
```

---

## Error Handling

All data functions throw on error. Always wrap in try/catch:

```typescript
// In API routes
export async function GET(request: NextRequest) {
  try {
    const data = await getRecipes(familyId)
    return NextResponse.json(data)
  } catch (error) {
    logger.error('Error fetching recipes', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    )
  }
}
```

---

## Date Handling

All dates are ISO 8601 strings in UTC:

```typescript
// Create date strings
const now = new Date().toISOString()
const tomorrow = new Date(Date.now() + 86400000).toISOString()

// Query with dates
const events = await getCalendarEvents(familyId, now, tomorrow)

// Parse dates
const eventDate = new Date(event.start_time)
```

---

## Pagination

```typescript
// Most list functions support limit/offset
const posts = await getCommunicationPosts(familyId, {
  limit: 20,
  offset: 0  // Page 1
})

const nextPage = await getCommunicationPosts(familyId, {
  limit: 20,
  offset: 20  // Page 2
})
```

---

## Sorting

```typescript
// Most queries have sensible defaults
const recipes = await getRecipes(familyId) // Sorted by name

// Some support custom sorting
const recipes = await getRecipes(familyId, {
  sortBy: 'rating',
  sortOrder: 'desc'
})
```

---

## Relations

Nested data is included automatically:

```typescript
const recipe = await getRecipe(recipeId)
// Includes:
// - recipe.ratings[] (with member info)
// - recipe.favorites[] (member_ids)
// - recipe.averageRating (calculated)
// - recipe.ratingsCount (calculated)

const post = await getCommunicationPost(postId)
// Includes:
// - post.author (member info)
// - post.reactions[] (with member info)
```

---

## Common Scenarios

### Scenario: Create a Meal Plan Entry
```typescript
import { getOrCreateMealPlan, createMealPlanEntry } from '@/lib/data/meals'

// 1. Ensure meal plan exists for the week
const mealPlan = await getOrCreateMealPlan(familyId, '2026-01-13')

// 2. Add entry
const entry = await createMealPlanEntry({
  meal_plan_id: mealPlan.id,
  date: '2026-01-15',
  meal_type: 'DINNER',
  recipe_id: recipeId,  // Optional
  custom_name: 'Spaghetti Night'  // Or use this
})
```

### Scenario: Check Screen Time Remaining
```typescript
import { getMemberAllowances } from '@/lib/data/screentime'

const allowances = await getMemberAllowances(memberId)
const ipadAllowance = allowances.find(a => a.screen_type.name === 'iPad')

if (ipadAllowance.remaining_minutes > 0) {
  // Allow access
} else {
  // Show grace request option
}
```

### Scenario: Get Upcoming Tasks
```typescript
import { getTodayTodos, getUpcomingTodos, getOverdueTodos } from '@/lib/data/todos'

const overdue = await getOverdueTodos(familyId)
const today = await getTodayTodos(familyId)
const upcoming = await getUpcomingTodos(familyId, 7) // Next 7 days

const allTasks = [...overdue, ...today, ...upcoming]
```

### Scenario: Track Leftover Usage
```typescript
import { createLeftover, getActiveLeftovers, markLeftoverUsed } from '@/lib/data/meals'

// Store leftover
const leftover = await createLeftover({
  family_id: familyId,
  name: 'Spaghetti',
  quantity: '4 servings',
  stored_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 3 * 86400000).toISOString(), // 3 days
  created_by: memberId
})

// Later: mark as used
await markLeftoverUsed(leftover.id)

// Get waste stats
const stats = await getLeftoverStats(familyId, startDate, endDate)
console.log(`Waste rate: ${stats.wasteRate}%`)
```

---

## Testing with Data Modules

When testing API routes that use data modules:

```typescript
// Mock the data module
jest.mock('@/lib/data/recipes', () => ({
  getRecipes: jest.fn(),
  createRecipe: jest.fn(),
}))

import { getRecipes } from '@/lib/data/recipes'

// In test
getRecipes.mockResolvedValue(mockRecipes)

// Test your route
const response = await GET(request)
expect(getRecipes).toHaveBeenCalledWith(familyId)
```

---

## Performance Tips

### 1. Select Only Needed Fields
```typescript
// Instead of
.select('*')

// Use
.select('id, name, status')
```

### 2. Use Pagination
```typescript
// For large result sets
const items = await getXs(familyId, { limit: 20, offset: page * 20 })
```

### 3. Cache Where Appropriate
```typescript
// In Server Components
const recipes = await getRecipes(familyId)
// Automatically cached by Next.js

// In API routes, consider Redis for frequently accessed data
```

### 4. Use Indexes
All queries use indexed columns:
- family_id (indexed on all tables)
- member_id (indexed where applicable)
- Date columns (for range queries)

---

## Module Function Index

### families.ts
- `getFamily`, `getFamilyWithMembers`, `getUserFamilies`
- `createFamily`, `updateFamily`
- `getFamilySettings`, `updateFamilySettings`
- `getModuleConfigurations`, `isModuleEnabled`, `setModuleEnabled`

### members.ts
- `getMember`, `getMembers`, `createMember`, `updateMember`
- `setMemberPin`, `verifyMemberPin`
- `getDashboardLayout`, `updateDashboardLayout`
- `getMemberModuleAccess`, `setMemberModuleAccess`

### chores.ts
- `getChoreDefinitions`, `createChoreDefinition`
- `getChoreAssignments`, `getTodayChores`
- `completeChore` (RPC), `approveChore` (RPC)

### credits.ts
- `getCreditBalance`, `getCreditTransactions`
- `getRewardItems`, `redeemReward` (RPC)

### kiosk.ts
- `createKioskSession`, `getKioskSession`
- `lockKioskSession`, `unlockKioskSession`
- `getOrCreateKioskSettings`, `updateKioskSettings`

### meals.ts
- `getOrCreateMealPlan`, `getMealPlanWithEntries`
- `createMealPlanEntry`, `updateMealPlanEntry`
- `getActiveLeftovers`, `getExpiringLeftovers`
- `createLeftover`, `markLeftoverUsed`, `getLeftoverStats`

### recipes.ts
- `getRecipes`, `getRecipe`, `createRecipe`
- `rateRecipe`, `getRecipeRatings`
- `addFavoriteRecipe`, `getFavoriteRecipes`
- `getPopularRecipes`, `searchRecipes`

### calendar.ts
- `getCalendarEvents`, `getUpcomingEvents`, `getTodayEvents`
- `createCalendarEvent`, `updateCalendarEvent`
- `assignMembersToEvent`, `getMemberEvents`
- `getCalendarConnections`, `checkEventConflicts`

### communication.ts
- `getCommunicationPosts`, `getCommunicationPost`
- `createCommunicationPost`, `updateCommunicationPost`
- `addPostReaction`, `removePostReaction`
- `togglePostPin`, `getPinnedPosts`

### routines.ts
- `getRoutines`, `getMemberRoutines`, `getRoutine`
- `createRoutine`, `updateRoutine`
- `addRoutineItem`, `reorderRoutineItems`
- `completeRoutine`, `getTodayCompletions`
- `getRoutineStats`, `getMemberRoutineCompletionRate`

### screentime.ts
- `getScreenTimeTypes`, `getMemberAllowances`
- `startScreenTimeSession`, `endScreenTimeSession`
- `requestGracePeriod`, `respondToGraceRequest`
- `resetDailyAllowances`, `getScreenTimeStats`

### todos.ts
- `getTodoItems`, `getTodoItem`, `createTodoItem`
- `completeTodoItem`, `uncompleteTodoItem`
- `getOverdueTodos`, `getTodayTodos`, `getUpcomingTodos`
- `getTodoStats`, `getMemberTodoStats`

### transport.ts
- `getTransportSchedules`, `createTransportSchedule`
- `getCarpoolGroups`, `createCarpoolGroup`
- `addCarpoolMember`, `removeCarpoolMember`

### documents.ts
- `getDocuments`, `getExpiringDocuments`
- `createDocument`, `updateDocument`
- `createDocumentShareLink`, `getDocumentByShareToken`

### pets.ts
- `getPets`, `getPetWithHistory`, `createPet`
- `recordPetFeeding`, `getPetFeedings`
- `recordVetVisit`, `getPetVetVisits`

---

## Advanced Examples

### Multi-Step Operation
```typescript
// Create recipe from URL import
const recipe = await createRecipe({
  family_id: familyId,
  name: 'Imported Recipe',
  created_by: memberId,
  instructions: extractedInstructions,
  servings: 4,
  source_url: url
})

// Add to meal plan
const mealPlan = await getOrCreateMealPlan(familyId, weekStart)
const entry = await createMealPlanEntry({
  meal_plan_id: mealPlan.id,
  date: '2026-01-15',
  meal_type: 'DINNER',
  recipe_id: recipe.id
})

// Create audit log
await supabase.from('audit_logs').insert({
  family_id: familyId,
  member_id: memberId,
  action: 'RECIPE_ADDED_TO_MEAL_PLAN',
  entity_type: 'RECIPE',
  entity_id: recipe.id,
  result: 'SUCCESS'
})
```

### Analytics Dashboard
```typescript
// Gather stats from multiple modules
const [
  choreStats,
  todoStats,
  routineStats,
  screenTimeStats
] = await Promise.all([
  getChoreStats(familyId, startDate, endDate),
  getTodoStats(familyId, startDate, endDate),
  getMemberRoutineCompletionRate(memberId, 7),
  getScreenTimeStats(memberId, startDate, endDate)
])

return {
  chores: choreStats,
  todos: todoStats,
  routines: routineStats,
  screenTime: screenTimeStats
}
```

---

## Migration from Prisma

### Before (Prisma)
```typescript
const recipes = await prisma.recipe.findMany({
  where: { familyId, isActive: true },
  include: {
    ratings: {
      include: { member: true }
    },
    favorites: true
  },
  orderBy: { name: 'asc' }
})
```

### After (Supabase via Data Module)
```typescript
import { getRecipes } from '@/lib/data/recipes'

const recipes = await getRecipes(familyId)
// Already includes ratings and favorites
// Already sorted by name
// RLS automatically enforced
```

---

## Best Practices

### ✅ DO
- Import functions from data modules
- Let RLS handle security
- Use type-safe parameters
- Handle errors in API routes
- Use helper functions for common queries

### ❌ DON'T
- Use Supabase client directly in API routes
- Manually check family_id in application code (RLS does this)
- Forget to handle errors
- Repeat query logic (use data modules)

---

## Quick Copy-Paste Templates

### API Route Template
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getXs, createX } from '@/lib/data/xs'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const familyId = searchParams.get('familyId')

    const items = await getXs(familyId!)
    return NextResponse.json(items)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    )
  }
}
```

### Server Component Template
```typescript
import { createClient } from '@/lib/supabase/server'
import { getXs } from '@/lib/data/xs'

export default async function XsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/auth/signin')

  const familyId = 'family-id' // Get from context/param
  const items = await getXs(familyId)

  return (
    <div>
      {items.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  )
}
```

---

## Troubleshooting

### Error: "Cannot find module '@/lib/database.types'"
**Solution:** Generate types
```bash
supabase gen types typescript --local > lib/database.types.ts
```

### Error: "Cannot access cookies() in this context"
**Solution:** Only call data modules from:
- API routes
- Server Actions
- Server Components
NOT from Client Components or outside request context

### Error: "No rows returned"
**Solution:** Check RLS policies - user might not have access
```sql
-- Verify policy allows access
SELECT * FROM table WHERE family_id = 'test-family'
```

### Error: "Foreign key constraint violation"
**Solution:** Ensure referenced records exist
```typescript
// Create family first
const family = await createFamily(...)

// Then create member
const member = await createMember({ family_id: family.id, ... })
```

---

## Resources

### Documentation
- `docs/PHASE_7_COMPLETE_SUMMARY.md` - Complete phase 7 summary
- `docs/PHASE_7_5_DATA_EXPANSION_COMPLETE.md` - Data module details
- `lib/test-utils/README.md` - Testing patterns

### Examples
- `__tests__/integration/api/kiosk/` - Example tests using data modules
- `app/api/kiosk/` - Example API routes using data modules

---

**Last Updated:** January 10, 2026  
**Quick Tip:** When in doubt, look at existing data modules - they all follow the same patterns!
