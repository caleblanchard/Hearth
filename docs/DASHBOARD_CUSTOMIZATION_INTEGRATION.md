# Dashboard Customization - Integration Guide

## Overview
All backend infrastructure and UI components for dashboard customization are **complete and tested**. This guide shows how to integrate them into the existing `DashboardContent.tsx`.

## What's Already Built ✅

- ✅ Database schema (`DashboardLayout` model)
- ✅ API endpoints (GET, PUT, POST with tests)
- ✅ Widget registry (14 widgets defined)
- ✅ Layout utilities (generation, validation, merging)
- ✅ Customizer UI (drag-and-drop modal)
- ✅ Layout hook (`useDashboardLayout`)
- ✅ All TypeScript types

## Integration Steps

### Step 1: Add Imports to DashboardContent.tsx

```typescript
// Add these imports at the top
import DashboardCustomizer from '@/components/dashboard/DashboardCustomizer';
import DashboardCustomizerButton from '@/components/dashboard/DashboardCustomizerButton';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import { WidgetConfig } from '@/types/dashboard';
```

### Step 2: Add State in Component

```typescript
export default function DashboardContent() {
  // ... existing state ...
  const [isCustomizing, setIsCustomizing] = useState(false);
  
  // Add layout hook
  const {
    layout,
    availableWidgets,
    loading: layoutLoading,
    saveLayout,
    resetLayout,
  } = useDashboardLayout();
  
  // ... rest of component ...
}
```

### Step 3: Create Widget Ordering Helper

Add this function before the `return` statement:

```typescript
// Helper to check widget order and visibility
const getWidgetOrder = (widgetId: string): number | null => {
  const widget = layout.find(w => w.id === widgetId);
  if (!widget || !widget.enabled) return null;
  return widget.order;
};

// Get all enabled widgets sorted by order
const enabledWidgetIds = layout
  .filter(w => w.enabled)
  .sort((a, b) => a.order - b.order)
  .map(w => w.id);
```

### Step 4: Create Widget Map

Add this before the `return` statement:

```typescript
// Map widget IDs to their JSX elements
const widgetMap: Record<string, JSX.Element | null> = {
  chores: enabledModules.has('CHORES') ? (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6...">
      {/* COPY EXISTING CHORES CARD JSX HERE */}
    </div>
  ) : null,
  
  screentime: enabledModules.has('SCREEN_TIME') ? (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6...">
      {/* COPY EXISTING SCREEN TIME CARD JSX HERE */}
    </div>
  ) : null,
  
  // ... repeat for all widgets ...
  
  transport: enabledModules.has('TRANSPORT') ? (
    <div className="md:col-span-2 lg:col-span-2">
      <TransportWidget memberId={session?.user?.id} />
    </div>
  ) : null,
  
  weather: <WeatherWidget />, // Always available
  
  // ... etc for all 14 widgets
};
```

### Step 5: Replace Grid Rendering

Replace the existing grid rendering with:

```typescript
return (
  <>
    <div className="mb-6">
      <SickModeBanner />
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {enabledWidgetIds.map(widgetId => {
        const widget = widgetMap[widgetId];
        if (!widget) return null;
        
        return <div key={widgetId}>{widget}</div>;
      })}
    </div>
    
    {/* Customizer Button - Only show for authenticated users */}
    {!guestSession && (
      <DashboardCustomizerButton 
        onClick={() => setIsCustomizing(true)} 
      />
    )}
    
    {/* Customizer Modal */}
    <DashboardCustomizer
      isOpen={isCustomizing}
      onClose={() => setIsCustomizing(false)}
      widgets={layout}
      availableWidgets={availableWidgets}
      onSave={saveLayout}
      onReset={resetLayout}
    />
  </>
);
```

## Alternative: Minimal Integration (Fastest)

If you want to test the customization feature quickly without refactoring everything:

### Option 1: Add Customizer to Existing Dashboard

1. Keep all existing widget rendering code as-is
2. Only add the customizer button and modal at the end:

```typescript
return (
  <>
    {/* ALL EXISTING CODE STAYS THE SAME */}
    <div className="mb-6">
      <SickModeBanner />
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* ... ALL EXISTING WIDGETS ... */}
    </div>
    
    {/* NEW: Add customizer */}
    {!guestSession && (
      <>
        <DashboardCustomizerButton 
          onClick={() => setIsCustomizing(true)} 
        />
        <DashboardCustomizer
          isOpen={isCustomizing}
          onClose={() => setIsCustomizing(false)}
          widgets={layout}
          availableWidgets={availableWidgets}
          onSave={saveLayout}
          onReset={resetLayout}
        />
      </>
    )}
  </>
);
```

This allows users to customize their preferences, but the current page won't reflect changes until you complete the full integration. It's a good way to test the customization UI.

## Testing the Integration

1. **Start the app**: `npm run dev`
2. **Navigate to dashboard**: Should load normally
3. **Click "Customize" button**: Modal should open
4. **Drag widgets**: Reorder should work
5. **Toggle visibility**: Switches should work
6. **Click "Save"**: Should persist to database
7. **Refresh page**: Layout should be restored (once fully integrated)
8. **Click "Reset"**: Should restore defaults

## Troubleshooting

### Customizer button not showing
- Check that user is authenticated (not guest)
- Check console for errors
- Verify imports are correct

### Layout not persisting
- Check browser console for API errors
- Verify database migration ran
- Check auth middleware

### Widgets not rendering
- Check `widgetMap` has all widget IDs
- Verify `enabledModules` is populated
- Check module configurations in database

## Files Created

```
/app/api/dashboard/layout/route.ts       - API endpoints
/components/dashboard/DashboardCustomizer.tsx
/components/dashboard/DashboardCustomizerButton.tsx
/hooks/useDashboardLayout.ts
/lib/dashboard/widget-registry.ts
/lib/dashboard/layout-utils.ts
/types/dashboard.ts
/prisma/migrations/.../add_dashboard_layout/
/__tests__/integration/api/dashboard/layout.test.ts
```

## Next Steps After Integration

1. **Component Tests**: Add tests for DashboardCustomizer
2. **E2E Tests**: Test full customization flow
3. **User Documentation**: How-to guide for customization
4. **Optional**: Extract individual cards into components
5. **Optional**: Add preset layouts (Parent View, Child View, etc.)

## Estimated Time

- **Minimal Integration** (Option 1): 15 minutes
- **Full Integration** (Steps 1-5): 1-2 hours
- **Testing**: 30 minutes
- **Documentation**: 30 minutes

**Total**: 2-3 hours for complete integration and testing

---

**Status**: Ready for integration
**Last Updated**: 2026-01-08
