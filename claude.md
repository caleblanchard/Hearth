# Claude Development Notes

## Test-Driven Development (TDD) Approach

This project follows a strict Test-Driven Development methodology for all feature implementations. The TDD cycle consists of three phases:

### 1. Red Phase - Write Failing Tests First
- Write comprehensive tests for the feature before implementing any code
- Tests should fail initially because the implementation doesn't exist yet
- This ensures tests are actually testing something and not giving false positives

### 2. Green Phase - Implement Minimum Code to Pass Tests
- Write the simplest implementation that makes all tests pass
- Focus on functionality over optimization at this stage
- Verify all tests pass after implementation

### 3. Refactor Phase - Improve Code Quality
- Refactor code for better readability, maintainability, and performance
- Ensure all tests still pass after refactoring
- Add additional tests if edge cases are discovered

## Current Implementation Pattern

### Feature Implementation Sequence

For each new feature, we follow this order:

1. **Database Schema** - Define Prisma models and relationships
2. **API Integration Tests** - Write comprehensive tests for all API endpoints
3. **API Implementation** - Implement routes to make tests pass
4. **Component Tests** - Write tests for UI components
5. **Component Implementation** - Build UI components to make tests pass
6. **Documentation** - Update relevant documentation files

### Test Coverage Goals

- **Target**: 80%+ code coverage
- **Integration Tests**: All API endpoints must have comprehensive test coverage
  - Authentication checks
  - Authorization/permission checks
  - Input validation
  - Success cases
  - Error handling
  - Edge cases
- **Component Tests**: UI components should test:
  - Rendering with various props
  - User interactions
  - API integration
  - Loading states
  - Error states
  - Edge cases

## Recent Features Implemented with TDD

### Rules Engine & Automation (Section 11)
- **Status**: Core Implementation Complete - Some Test Refinement Needed
- **API Tests**: 112/112 passing ✓
  - 49 tests for `/api/rules` (GET, POST)
  - 38 tests for `/api/rules/[id]` (GET, PATCH, DELETE)
  - 12 tests for `/api/rules/[id]/toggle` (PATCH)
  - 15 tests for `/api/rules/[id]/test` (POST - dry run)
  - 8 tests for `/api/rules/templates` (GET)
  - 18 tests for `/api/rules/executions` (GET with filters)
- **Unit Tests**: 119/194 passing (61%)
  - Validation tests: 26/32 passing (81%)
  - Trigger/action/safety tests need refinement
- **Component Tests**: 26/43 passing (60%)
  - RulesList: 10/10 passing ✓
  - TemplateBrowser: 8/8 passing ✓
  - CreateRuleForm & ExecutionHistory: Need accessibility fixes
- **Core Implementation**:
  - 8 trigger types (chore_completed, chore_streak, screentime_low, inventory_low, calendar_busy, medication_given, routine_completed, time_based)
  - 8 action types (award_credits, send_notification, add_shopping_item, create_todo, lock_medication, suggest_meal, reduce_chores, adjust_screentime)
  - 8 pre-built rule templates
  - Async fire-and-forget execution with rate limiting
  - Integration hooks in 7 existing endpoints
  - Cron endpoint for time-based triggers
- **Database**: AutomationRule and RuleExecution models with full relations
- **UI Components**: Rules list, create form, template browser, execution history
- **Next Steps**: Refine unit/component tests to match implementation details

### Recipe Management - Manual Creation & URL Import (Section 7.2)
- **Status**: Complete ✓
- **Tests**: 93/93 passing (100%)
  - 20 tests for POST `/api/meals/recipes/import` (Schema.org extraction)
  - 25 component tests for NewRecipeForm
  - 48 existing recipe API tests (CRUD, rating, favorites)
- **Features Implemented**:
  - Manual recipe creation form at `/dashboard/meals/recipes/new`
  - URL import with Schema.org/JSON-LD extraction
  - Two-step import flow (Extract → Review/Edit → Save)
  - Support for all major recipe sites (AllRecipes, Food Network, NYT Cooking, etc.)
  - Dynamic ingredient management (add/remove with quantity, unit, name)
  - Dynamic instruction management (add/remove/reorder)
  - Dietary tags selection
  - ISO 8601 duration parsing (prep/cook times)
  - Automatic difficulty inference
  - Category mapping to enum values
- **Implementation Files**:
  - `/lib/recipe-extractor.ts` - Schema.org extraction utility (300+ lines)
  - `/app/api/meals/recipes/import/route.ts` - Import API endpoint
  - `/app/dashboard/meals/recipes/new/page.tsx` - Recipe creation form (700+ lines)
  - `/app/dashboard/meals/RecipesList.tsx` - Added "Add Recipe" button

### Communication Board (Section 8.1)
- **Status**: Complete
- **Tests Written**: 76 API and component tests (all passing)
  - 49 API integration tests
  - 27 component tests for CommunicationFeed and PostComposer
- **Implementation**: Full API and UI implementation complete

### Routines & Morning Checklists (Section 9)
- **Status**: Complete
- **Tests**: Comprehensive coverage of routine CRUD and checklist operations
- **Implementation**: Full API and UI implementation

### PWA & Push Notifications (Section 11)
- **Status**: Complete ✓
- **Tests**: 26 API tests (all passing)
  - 13 tests for POST/DELETE `/api/notifications/subscribe` (push subscription management)
  - 13 tests for GET/PATCH `/api/notifications/preferences` (notification preferences)
- **Database Schema**:
  - `PushSubscription` model for storing Web Push subscriptions (endpoint, p256dh, auth keys)
  - `NotificationPreference` model for user preferences (enabled types, quiet hours, timing)
  - 10 new NotificationType enum values (LEFTOVER_EXPIRING, DOCUMENT_EXPIRING, MEDICATION_AVAILABLE, etc.)
- **Core Implementation**:
  - Service Worker (`/public/sw.js`) with cache-first strategy for static assets
  - Network-first for API calls with offline fallback
  - Background sync for offline actions
  - Push notification handler with click actions
  - Offline page (`/public/offline.html`) with connection status
- **PWA Features**:
  - Full offline support with intelligent caching
  - Install prompt component with dismissal and 7-day snooze
  - Service worker registration with automatic updates
  - IndexedDB queue for offline actions
  - Manifest configuration for app-like experience
- **Push Notification System**:
  - Web Push API integration with VAPID keys
  - Push notification utility (`/lib/push-notifications.ts`)
  - Quiet hours support (configurable start/end times)
  - Per-notification-type preferences
  - Automatic expired subscription cleanup
  - Support for notification actions and badges
- **Notification Preferences UI**:
  - Full preferences management at `/dashboard/settings/notifications`
  - Toggle push notifications on/off
  - Configure quiet hours (e.g., 22:00-07:00)
  - Select which notification types to receive
  - Customize timing (leftover expiring hours, document expiring days, carpool reminder minutes)
  - In-app vs push notification toggles
- **VAPID Key Generation**:
  - Script at `/scripts/generate-vapid-keys.js` for one-time setup
  - Environment variable configuration (NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
- **Integration Examples**:
  - Comprehensive examples in `/lib/examples/push-notification-example.ts`
  - Shows integration with leftovers, documents, medications, carpool, routines, maintenance
  - Includes cron job patterns for scheduled notifications
- **Features Implemented**:
  - ✅ Service worker with cache-first for static assets
  - ✅ Network-first for API calls with cache fallback
  - ✅ Background sync for offline actions (IndexedDB queue)
  - ✅ PWA install prompt with smart timing
  - ✅ Push notification subscription management
  - ✅ Notification preferences with quiet hours
  - ✅ 10 notification types ready for integration
  - ✅ Offline support with fallback page
  - ✅ Automatic service worker updates
  - ✅ Full PWA manifest configuration
- **Next Steps**:
  - Integrate push notifications into cron jobs (leftovers, documents, medications, etc.)
  - Add notification center UI to view notification history
  - Implement notification action handlers (e.g., "Mark Complete" from notification)
  - Add notification preferences to onboarding flow

## Testing Technologies

- **Test Framework**: Jest
- **Component Testing**: React Testing Library
- **API Testing**: Supertest-style with mocked Prisma client
- **Mocking**:
  - `@/lib/test-utils/prisma-mock` for database mocking
  - `@/lib/test-utils/auth-mock` for session mocking

## Best Practices

1. **Never Skip Tests**: Always write tests before implementation
2. **Test Isolation**: Each test should be independent and not rely on other tests
3. **Clear Test Names**: Use descriptive test names that explain what is being tested
4. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification
5. **Mock External Dependencies**: Use mocks for database, auth, and external APIs
6. **Test Edge Cases**: Don't just test happy paths - test failures and edge cases
7. **Keep Tests Fast**: Use mocks to avoid slow database or network calls

## Running Tests

```bash
# Run all tests
npm test

# Run tests for a specific feature
npx jest __tests__/integration/api/communication --no-watchman --runInBand

# Run component tests
npx jest __tests__/components/communication --no-watchman

# Run with coverage
npm test -- --coverage
```

## Next Features (TDD Pipeline)

1. **Integrate Push Notifications** - Add notification sending to cron jobs and existing modules
2. **Notification Center UI** - Build notification history viewer
3. **File Upload Integration** - Implement photo uploads for chores, recipes, pets, etc.
4. **Projects Module** - Task dependencies and Gantt charts
5. **Advanced Analytics Dashboard** - Fairness index, completion rates, trends

---

Last Updated: 2026-01-02
