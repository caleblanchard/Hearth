# Multi-Dish Meal Planning - Quick Reference

## 🎯 What's Working Right Now

### Backend APIs (Ready to Use)

#### 1. Search Recipes
```bash
GET /api/meals/recipes/search?q=chicken

Response:
{
  "recipes": [
    {
      "id": "recipe-123",
      "name": "Chicken Parmesan",
      "imageUrl": "/images/chicken.jpg",
      "category": "DINNER",
      "dietaryTags": ["GLUTEN_FREE"],
      "score": 100
    }
  ]
}
```

#### 2. Get Meal Plan (Now with Dishes!)
```bash
GET /api/meals/plan?week=2026-01-06

Response:
{
  "mealPlan": {
    "meals": [
      {
        "id": "entry-1",
        "date": "2026-01-06",
        "mealType": "DINNER",
        "notes": "Family dinner",
        "dishes": [
          {
            "id": "dish-1",
            "dishName": "Spaghetti Carbonara",
            "recipeId": "recipe-1",
            "sortOrder": 0
          },
          {
            "id": "dish-2",
            "dishName": "Garlic Bread",
            "recipeId": null,
            "sortOrder": 1
          }
        ]
      }
    ]
  }
}
```

#### 3. Create Meal with Multiple Dishes
```bash
POST /api/meals/plan

Body:
{
  "date": "2026-01-10",
  "mealType": "DINNER",
  "notes": "Optional notes",
  "dishes": [
    { "recipeId": "recipe-1" },           // Name from recipe
    { "dishName": "Custom Side Dish" },   // Custom name
    { "recipeId": "recipe-2", "dishName": "My Version" }  // Override
  ]
}
```

#### 4. Add Dish to Existing Meal
```bash
POST /api/meals/plan/dishes

Body:
{
  "mealEntryId": "entry-1",
  "recipeId": "recipe-1"        // OR "dishName": "Custom Dish"
}
```

#### 5. Update Dish
```bash
PATCH /api/meals/plan/dishes/dish-1

Body:
{
  "dishName": "Updated Name",   // Optional
  "sortOrder": 2                // Optional
}
```

#### 6. Delete Dish
```bash
DELETE /api/meals/plan/dishes/dish-1
```

## 🚀 Next Steps (Implementation Order)

### Step 1: Create RecipeAutocomplete Component ⚡ START HERE

**File**: `components/meals/RecipeAutocomplete.tsx`

**Code**: See `docs/RECIPE_AUTOCOMPLETE_GUIDE.md`

**Why First**: This component is used in multiple places, so implement it first.

### Step 2: Update MealPlanner Component

**File**: `app/dashboard/meals/MealPlanner.tsx`

**Changes Needed**:
1. Display `meal.dishes` array instead of `meal.customName`
2. Replace text input with `RecipeAutocomplete`
3. Add "Add Dish" button for existing meals
4. Add delete button for each dish
5. Add reorder buttons (up/down)

**Key Code Snippets**:

```tsx
// Display dishes
{entry.dishes && entry.dishes.length > 0 ? (
  <div className="space-y-1">
    {entry.dishes.slice(0, 2).map((dish) => (
      <div key={dish.id} className="text-sm">
        {dish.dishName}
        {dish.recipeId && (
          <span className="text-xs text-info ml-1">(recipe)</span>
        )}
      </div>
    ))}
    {entry.dishes.length > 2 && (
      <div className="text-xs text-gray-500">
        +{entry.dishes.length - 2} more
      </div>
    )}
  </div>
) : (
  <div className="text-gray-400">No dishes</div>
)}

// Add dish
<RecipeAutocomplete
  value={newDishName}
  onChange={(name, recipe) => {
    setNewDishName(name);
    setSelectedRecipe(recipe);
  }}
/>

<button onClick={handleAddDish}>
  Add Dish
</button>

// Handle add dish
const handleAddDish = async () => {
  await fetch('/api/meals/plan/dishes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mealEntryId: entry.id,
      dishName: newDishName,
      recipeId: selectedRecipe?.id || null,
    }),
  });
  // Reload meal plan
  loadMealPlan(weekStart);
};

// Delete dish
const handleDeleteDish = async (dishId: string) => {
  await fetch(`/api/meals/plan/dishes/${dishId}`, {
    method: 'DELETE',
  });
  loadMealPlan(weekStart);
};
```

### Step 3: Add "Add to Meal" Button to Recipe Detail

**File**: `app/dashboard/meals/recipes/[id]/page.tsx`

**Location**: Around line 274 (in the header actions)

```tsx
const [showAddToMealModal, setShowAddToMealModal] = useState(false);

// In header buttons section (near favorite/delete)
<button
  onClick={() => setShowAddToMealModal(true)}
  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
  title="Add to Meal Plan"
>
  <CalendarIcon className="h-6 w-6 text-gray-400" />
</button>

// Modal (to be created in Step 4)
{showAddToMealModal && (
  <AddToMealModal
    isOpen={showAddToMealModal}
    onClose={() => setShowAddToMealModal(false)}
    recipeId={recipe.id}
    recipeName={recipe.name}
  />
)}
```

### Step 4: Create AddToMealModal Component

**File**: `components/meals/AddToMealModal.tsx`

**Features**:
- Date picker
- Meal type selector (auto-select based on time of day)
- Option to add to existing meal or create new
- Use RecipeAutocomplete if recipe not pre-selected

### Step 5: Create MealDetailModal Component

**File**: `components/meals/MealDetailModal.tsx`

**Features**:
- Read-only display of meal
- Show all dishes with recipe links
- Show notes
- Close button

### Step 6: Update Calendar to Show Meals

**File**: `app/dashboard/calendar/page.tsx`

**Changes**:
1. Fetch meals in addition to events
2. Create virtual events for meals at fixed times:
   - BREAKFAST: 7:00 AM
   - LUNCH: 12:00 PM
   - DINNER: 6:00 PM
   - SNACK: 3:00 PM
3. Use first dish name as event title
4. Add meal icon
5. Click opens MealDetailModal

## 📝 Testing Checklist

After implementing each component:

- [ ] Component renders without errors
- [ ] Recipe search returns results
- [ ] Can add dish with recipe
- [ ] Can add dish with custom name
- [ ] Can delete dish
- [ ] Can reorder dishes
- [ ] Meal plan reloads after changes
- [ ] Keyboard navigation works
- [ ] Mobile responsive
- [ ] Dark mode works
- [ ] Error states handled

## 🐛 Common Issues & Solutions

### Issue: "Recipe not found" after adding
**Solution**: Make sure recipe belongs to the same family

### Issue: Dishes not showing after adding
**Solution**: Reload meal plan data after POST request

### Issue: Search not working
**Solution**: Check minimum 2 characters, verify API endpoint

### Issue: Sort order wrong
**Solution**: Backend auto-calculates, or manually set when reordering

## 💡 Pro Tips

1. **Start Simple**: Get basic display working before adding drag-and-drop
2. **Test with Data**: Create sample meals/recipes to test with
3. **Use Browser DevTools**: Check Network tab for API responses
4. **Check Console**: Look for React/TypeScript errors
5. **Incremental**: One feature at a time, test thoroughly

## 📚 Documentation Reference

- **Complete Status**: `docs/MEAL_PLANNING_MULTI_DISH_STATUS.md`
- **Component Guide**: `docs/RECIPE_AUTOCOMPLETE_GUIDE.md`
- **Session Summary**: `docs/SESSION_SUMMARY_MEAL_PLANNING.md`

## ✅ Current Test Results

Recipe Search API: **12/12 tests passing** ✓

```bash
# Run tests
npx jest __tests__/integration/api/meals/recipes/search/route.test.ts
```

---

**Last Updated**: 2026-01-06  
**Status**: Backend Complete, UI Pending  
**Priority**: RecipeAutocomplete Component
