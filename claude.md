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

### Communication Board (Section 8.1)
- **Status**: In Progress
- **Tests Written**: 49 API tests (all passing)
  - 16 tests for GET/POST `/api/communication`
  - 17 tests for PATCH/DELETE `/api/communication/[id]`
  - 16 tests for POST/DELETE `/api/communication/[id]/react`
- **Component Tests**: 16 tests for CommunicationFeed component
- **Implementation**: API routes complete, UI components in progress

### Routines & Morning Checklists (Section 9)
- **Status**: Complete
- **Tests**: Comprehensive coverage of routine CRUD and checklist operations
- **Implementation**: Full API and UI implementation

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

1. **Rules Engine Test Refinement** - Update remaining unit/component tests to match implementation
2. **Communication Board** - Complete UI components
3. **Meal Planning** - Following same TDD pattern
4. **Screen Time Grace Period** - See plan at `.claude/plans/jiggly-crafting-lark.md`

---

Last Updated: 2026-01-02
