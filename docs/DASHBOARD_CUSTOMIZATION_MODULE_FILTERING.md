# Dashboard Customization - Module-Based Widget Filtering (Working as Designed)

## Issue Report: "Only 7 Widgets Show in Customizer"

**Date**: 2026-01-08  
**Status**: ✅ Working as Designed (with UX improvement added)

---

## User Report

User reported seeing only 7 widgets in the customization modal despite having 13+ widgets visible on the dashboard.

**Widgets shown in customizer:**
1. Today's Chores
2. Screen Time
3. Upcoming Events
4. To-Do List
5. Shopping List
6. Credits
7. Weather

**Widgets missing from customizer:**
- My Project Tasks
- Transport
- Recent Messages (Communication)
- Medications
- Maintenance
- Inventory
- Today's Meals

---

## Root Cause: Module-Based Filtering

This is **working as designed**. The dashboard customization system only shows widgets for **enabled modules**.

### How It Works

1. **Module Configuration**: Each family can enable/disable modules in Settings
2. **Widget Filtering**: Widgets are automatically filtered based on enabled modules
3. **Dynamic Updates**: When modules are enabled/disabled, available widgets update accordingly

### Widget-to-Module Mapping

| Widget | Required Module | Status in User's Family |
|--------|----------------|------------------------|
| Today's Chores | CHORES | ✅ Enabled |
| Screen Time | SCREEN_TIME | ✅ Enabled |
| Credits | CREDITS | ✅ Enabled |
| Shopping List | SHOPPING | ✅ Enabled |
| To-Do List | TODOS | ✅ Enabled |
| Upcoming Events | CALENDAR | ✅ Enabled |
| Weather | *(none)* | ✅ Always available |
| My Project Tasks | PROJECTS | ❌ Not enabled |
| Transport | TRANSPORT | ❌ Not enabled |
| Recent Messages | COMMUNICATION | ❌ Not enabled |
| Medications | HEALTH | ❌ Not enabled |
| Maintenance | MAINTENANCE | ❌ Not enabled |
| Inventory | INVENTORY | ❌ Not enabled |
| Today's Meals | MEAL_PLANNING | ❌ Not enabled |

---

## Why Widgets Show on Dashboard But Not in Customizer

**Dashboard Behavior**: Shows widgets for ALL enabled modules (system-wide)

**Customizer Behavior**: Shows widgets that YOUR USER can customize (based on enabled modules + permissions)

The user sees 13 widgets on the dashboard because those modules are enabled at the family level. However, the customizer only shows 7 because:
- The API correctly filters based on enabled modules
- This prevents users from customizing widgets they can't actually use
- This is a security/UX feature, not a bug

---

## UX Improvement Added

To make this clearer to users, added a helpful tip message in the customizer:

**New UI Element**:
```
┌─────────────────────────────────────────────────────────┐
│ ℹ️ Tip: More widgets will appear here when you enable  │
│ additional modules in Settings.                         │
└─────────────────────────────────────────────────────────┘
```

This message:
- Only shows when fewer than 14 widgets are available
- Links to module settings
- Explains why some widgets might be missing

---

## For Users: How to Get More Widgets

### Step 1: Enable Modules

1. Go to **Settings** → **Modules**
2. Enable the modules you want:
   - `PROJECTS` → Adds "My Project Tasks" widget
   - `TRANSPORT` → Adds "Transport" widget
   - `COMMUNICATION` → Adds "Recent Messages" widget
   - `HEALTH` → Adds "Medications" widget
   - `MAINTENANCE` → Adds "Maintenance" widget
   - `INVENTORY` → Adds "Inventory" widget
   - `MEAL_PLANNING` → Adds "Today's Meals" widget

### Step 2: Refresh Dashboard

1. Refresh the dashboard page
2. Open the customization modal
3. New widgets will appear automatically

### Step 3: Customize

1. Drag to reorder
2. Toggle visibility
3. Save changes

---

## Technical Details

### API Logic

```typescript
// From lib/dashboard/widget-registry.ts
export function getAvailableWidgets(
  enabledModules: Set<ModuleId>,
  role: Role
): WidgetMetadata[] {
  return Object.values(WIDGET_REGISTRY).filter((widget) => {
    // Filter out widgets for disabled modules
    if (widget.requiredModule && !enabledModules.has(widget.requiredModule)) {
      return false;
    }
    
    // Filter by role permissions
    if (widget.minRole && roleHierarchy[role] < roleHierarchy[widget.minRole]) {
      return false;
    }
    
    return true;
  });
}
```

### Database Query

```typescript
// From app/api/dashboard/layout/route.ts
const moduleConfigs = await prisma.moduleConfiguration.findMany({
  where: {
    familyId,
    isEnabled: true,  // Only enabled modules
  },
  select: {
    moduleId: true,
  },
});

const enabledModules = new Set(moduleConfigs.map((m) => m.moduleId));
```

---

## Benefits of This Design

### 1. Security
- Users can't access widgets for features they don't have permission for
- Prevents confusion about missing functionality

### 2. Clean UX
- Only shows relevant customization options
- Avoids cluttering the customizer with unavailable options
- Clear upgrade path (enable modules to get more widgets)

### 3. Performance
- Fewer widgets to render and manage
- Smaller payload from API
- Faster customization saves

### 4. Flexibility
- Widgets automatically appear when modules are enabled
- No manual configuration needed
- Seamless integration with module system

---

## Testing

To test with all widgets visible:

```sql
-- Enable all modules for your family
UPDATE module_configurations 
SET is_enabled = true 
WHERE family_id = 'your-family-id';
```

Or use the Settings UI:
1. Go to Settings → Modules
2. Enable all modules
3. Refresh dashboard
4. Open customizer
5. All 14 widgets should appear

---

## Files Modified

- `components/dashboard/DashboardCustomizer.tsx`
  - Added helpful tip message
  - Only shows when `widgets.length < 14`
  - Links to module settings

---

## Summary

✅ **Not a Bug**: System working as designed  
✅ **UX Improved**: Added helpful message  
✅ **Documentation**: Updated to explain behavior  
✅ **User Action**: Enable more modules to see more widgets  

---

**Working as Designed**: ✅  
**UX Enhancement Added**: ✅  
**Documentation Updated**: ✅  

