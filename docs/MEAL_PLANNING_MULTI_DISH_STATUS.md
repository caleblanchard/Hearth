# Meal Planning Multi-Dish Feature - Implementation Status

## Overview
This document tracks the implementation of multi-dish meal planning functionality, including recipe search autocomplete, calendar integration, and UI components.

## Completed Work

### Phase 1: Database Schema & Migration ✅
- **Created `MealPlanDish` model**
  - Links to `MealPlanEntry` (parent meal)
  - Optional link to `Recipe`
  - `dishName` field (copied from recipe at creation time)
  - `sortOrder` for display ordering
  
- **Updated `MealPlanEntry` model**
  - Added `dishes` relation
  - Deprecated `recipeId` and `customName` (kept for backward compatibility)
  
- **Updated `Recipe` model**
  - Added `mealDishes` relation

- **Data Migration**
  - Created migration script (`scripts/migrate-meal-dishes.ts`)
  - Verified no existing data needs migration
  - Schema pushed to database successfully

### Phase 2: API - Recipe Search ✅
- **Endpoint**: `GET /api/meals/recipes/search`
- **Location**: `/app/api/meals/recipes/search/route.ts`
- **Features**:
  - Weighted scoring algorithm:
    - Title match: 100 points
    - Dietary tag match: 50 points
    - Ingredient match: 25 points
  - Case-insensitive search
  - Returns top 5 results sorted by score
  - Includes recipe metadata (id, name, imageUrl, category, dietaryTags)
  
- **Tests**: 12/12 passing ✅
- **Location**: `__tests__/integration/api/meals/recipes/search/route.test.ts`

### Phase 3: API - Dish Management ✅
Created CRUD endpoints for managing dishes within meals:

#### POST /api/meals/plan/dishes
- **Location**: `/app/api/meals/plan/dishes/route.ts`
- **Features**:
  - Add dish to existing meal entry
  - Support custom dish name OR recipe link
  - If recipeId provided, copies recipe name (can be overridden)
  - Auto-calculates sortOrder based on existing dishes
  - Validates meal entry exists and belongs to user's family
  - Validates recipe exists if recipeId provided

#### PATCH /api/meals/plan/dishes/[id]
- **Location**: `/app/api/meals/plan/dishes/[id]/route.ts`
- **Features**:
  - Update dish name
  - Update sort order
  - Authorization checks

#### DELETE /api/meals/plan/dishes/[id]
- **Location**: `/app/api/meals/plan/dishes/[id]/route.ts`
- **Features**:
  - Delete dish from meal
  - Authorization checks

### Phase 4: API - Updated Meal Plan Endpoints ✅
Updated existing endpoints to support multi-dish structure:

#### GET /api/meals/plan
- **Updated**: Now includes `dishes` array in each meal entry
- **Sorting**: Dishes sorted by `sortOrder`
- **Backward Compatible**: Still returns deprecated `customName` and `recipeId` fields

#### POST /api/meals/plan
- **Updated**: Accepts optional `dishes` array
- **Features**:
  - Create meal with multiple dishes in one request
  - Each dish can have `dishName` and/or `recipeId`
  - Auto-fetches recipe name if recipeId provided
  - Backward compatible with old `customName`/`recipeId` fields
- **Response**: Returns meal entry with populated dishes array

## Remaining Work

### Phase 5: API - Calendar Integration 🔲
- [ ] Update `GET /api/calendar` to include meal plan events
- [ ] Display meals as virtual events at fixed times:
  - Breakfast: 7:00 AM
  - Lunch: 12:00 PM
  - Dinner: 6:00 PM
  - Snack: 3:00 PM
- [ ] Event title should be first dish name
- [ ] Events should be read-only from calendar view

### Phase 6: UI Components - Recipe Autocomplete 🔲
Create reusable autocomplete component for recipe search:

**Component**: `components/meals/RecipeAutocomplete.tsx`

**Features Needed**:
- Debounced search input (300ms)
- Calls `/api/meals/recipes/search?q={query}`
- Displays up to 5 results with:
  - Recipe thumbnail (if available)
  - Recipe name
  - Category badge
  - Dietary tag badges
- Highlight matching text
- Keyboard navigation (arrow keys, enter, escape)
- Allow custom text entry if recipe not found
- Return selected recipe OR custom text

**Props**:
```typescript
interface RecipeAutocompleteProps {
  value: string;
  onChange: (value: string, recipe?: { id: string; name: string }) => void;
  placeholder?: string;
  className?: string;
}
```

### Phase 7: UI Components - Modals 🔲

#### AddToMealModal
**Component**: `components/meals/AddToMealModal.tsx`

**Features Needed**:
- Date picker for selecting meal date
- Meal type selector (auto-selected, editable)
- Show existing meals for selected date
- "Add to existing meal" vs "Create new meal" toggle
- If adding to existing: Select which meal
- Validation and error handling

**Props**:
```typescript
interface AddToMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeId: string;
  recipeName: string;
}
```

#### MealDetailModal
**Component**: `components/meals/MealDetailModal.tsx`

**Features Needed**:
- Display meal type and date
- List all dishes (with recipe links if applicable)
- Show notes
- Read-only view (no editing from calendar)
- Close button

**Props**:
```typescript
interface MealDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealEntry: MealPlanEntry & { dishes: MealPlanDish[] };
}
```

### Phase 8: UI - Update MealPlanner 🔲
**Component**: `app/dashboard/meals/MealPlanner.tsx`

**Updates Needed**:
1. **Display Multiple Dishes**:
   - Show all dishes in meal cell (not just customName)
   - Show first 2 dishes, then "+N more" if > 2
   - Click to expand/edit

2. **Add Dish to Meal**:
   - Replace simple text input with RecipeAutocomplete
   - "Add another dish" button for existing meals
   - Save each dish separately via `/api/meals/plan/dishes`

3. **Edit Dishes**:
   - Allow reordering dishes (drag & drop or up/down buttons)
   - Edit individual dish names
   - Remove individual dishes
   - Update via PATCH `/api/meals/plan/dishes/[id]`

4. **Backward Compatibility**:
   - Handle meals that still use deprecated customName
   - Migrate on first edit

### Phase 9: UI - Update Recipe Detail 🔲
**Component**: `app/dashboard/meals/recipes/[id]/page.tsx`

**Updates Needed**:
1. Add "Add to Meal" button near favorite/delete buttons
2. Opens AddToMealModal with recipe pre-populated
3. Button should be prominent and easy to find

**Code Location**: After line 274 (in action buttons section)

```tsx
<button
  onClick={() => setShowAddToMealModal(true)}
  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
  title="Add to Meal Plan"
>
  <CalendarIcon className="h-6 w-6 text-gray-400" />
</button>
```

### Phase 10: UI - Update Calendar 🔲
**Component**: `app/dashboard/calendar/page.tsx`

**Updates Needed**:
1. Fetch meal events from updated API
2. Render meal "virtual events" at fixed times
3. Style differently from regular events (different color/icon)
4. Click opens MealDetailModal (read-only)
5. Show first dish name as event title

**Implementation Notes**:
- Meals should integrate seamlessly with existing events
- Consider using a distinct color (e.g., food/meal theme color)
- Add meal icon indicator
- Don't allow editing from calendar (redirect to meal planner)

### Phase 11: Testing & Documentation 🔲
- [ ] Write component tests for RecipeAutocomplete
- [ ] Write component tests for AddToMealModal
- [ ] Write component tests for MealDetailModal
- [ ] Update MealPlanner component tests
- [ ] Update Calendar component tests
- [ ] Run full test suite and fix any issues
- [ ] Update user documentation
- [ ] Create migration guide for users

## API Reference

### Recipe Search
```
GET /api/meals/recipes/search?q={query}

Response:
{
  recipes: [
    {
      id: string,
      name: string,
      imageUrl: string | null,
      category: string,
      dietaryTags: string[],
      score: number
    }
  ]
}
```

### Dish Management
```
POST /api/meals/plan/dishes
Body: {
  mealEntryId: string,
  recipeId?: string,
  dishName?: string
}

PATCH /api/meals/plan/dishes/[id]
Body: {
  dishName?: string,
  sortOrder?: number
}

DELETE /api/meals/plan/dishes/[id]
```

### Meal Plan (Updated)
```
GET /api/meals/plan?week=YYYY-MM-DD

Response:
{
  mealPlan: {
    id: string,
    weekStart: Date,
    meals: [
      {
        id: string,
        date: Date,
        mealType: string,
        notes: string | null,
        dishes: [
          {
            id: string,
            dishName: string,
            recipeId: string | null,
            sortOrder: number
          }
        ]
      }
    ]
  }
}

POST /api/meals/plan
Body: {
  date: string,
  mealType: string,
  notes?: string,
  dishes?: [
    {
      dishName?: string,
      recipeId?: string
    }
  ]
}
```

## Database Schema

### MealPlanDish
```prisma
model MealPlanDish {
  id            String   @id @default(uuid())
  mealEntryId   String
  recipeId      String?
  dishName      String
  sortOrder     Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  mealEntry MealPlanEntry @relation(...)
  recipe    Recipe?       @relation(...)
}
```

## Implementation Priority

If implementing in stages, recommended order:

1. ✅ Phase 1-4: API Foundation (Complete)
2. 🔲 Phase 6: RecipeAutocomplete (enables dish search everywhere)
3. 🔲 Phase 8: Update MealPlanner (core user workflow)
4. 🔲 Phase 9: Recipe "Add to Meal" button (discoverability)
5. 🔲 Phase 7: Modals (enhanced UX)
6. 🔲 Phase 5 & 10: Calendar integration (nice-to-have)
7. 🔲 Phase 11: Testing & docs

## Notes

- All API endpoints include proper authentication and authorization
- Backward compatibility maintained with deprecated fields
- Database migrations handled without data loss
- Recipe names are copied at dish creation time (not dynamic)
- Calendar meal events are "virtual" (no actual CalendarEvent records)
- First dish name used for calendar display
- Weighted search scoring provides relevant results

## Files Modified

### Database
- `prisma/schema.prisma` - Schema updates
- `scripts/migrate-meal-dishes.ts` - Data migration script

### API Routes
- `app/api/meals/recipes/search/route.ts` - NEW
- `app/api/meals/plan/dishes/route.ts` - NEW
- `app/api/meals/plan/dishes/[id]/route.ts` - NEW
- `app/api/meals/plan/route.ts` - UPDATED

### Tests
- `__tests__/integration/api/meals/recipes/search/route.test.ts` - NEW

### UI (Pending)
- `components/meals/RecipeAutocomplete.tsx` - TODO
- `components/meals/AddToMealModal.tsx` - TODO
- `components/meals/MealDetailModal.tsx` - TODO
- `app/dashboard/meals/MealPlanner.tsx` - TODO UPDATE
- `app/dashboard/meals/recipes/[id]/page.tsx` - TODO UPDATE
- `app/dashboard/calendar/page.tsx` - TODO UPDATE

## Testing Status

- Recipe Search API: ✅ 12/12 tests passing
- Dish Management API: 🔲 Tests not yet written
- Updated Meal Plan API: 🔲 Existing tests need updating
- UI Components: 🔲 Tests not yet written

---

Last Updated: 2026-01-06
