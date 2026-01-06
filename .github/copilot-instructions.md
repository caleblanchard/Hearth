# GitHub Copilot Instructions for Hearth Development

This file provides guidelines for GitHub Copilot to assist with development on the Hearth project. It's based on the project's development philosophy and established patterns.

## Project Overview

Hearth is a Family Management & Household ERP System built with Next.js, Prisma, and TypeScript. The project follows strict Test-Driven Development (TDD) practices for all feature implementations.

## Development Methodology

### Test-Driven Development (TDD)

All features must follow the TDD cycle:

1. **Red Phase** - Write comprehensive failing tests first
2. **Green Phase** - Implement minimum code to pass tests
3. **Refactor Phase** - Improve code quality while maintaining test coverage

Never implement code without tests first.

## Feature Implementation Sequence

When implementing new features, follow this order:

1. Database Schema (Prisma models)
2. API Integration Tests
3. API Implementation (routes)
4. Component Tests (UI)
5. Component Implementation
6. Documentation

## Test Coverage Standards

- **Target**: 80%+ code coverage
- **Integration Tests**: All API endpoints must have comprehensive coverage
  - Authentication checks
  - Authorization/permission checks
  - Input validation
  - Success cases
  - Error handling
  - Edge cases
- **Component Tests**: UI components should test
  - Rendering with various props
  - User interactions
  - API integration
  - Loading states
  - Error states
  - Edge cases

## Testing Technologies & Setup

- **Test Framework**: Jest
- **Component Testing**: React Testing Library
- **API Testing**: Supertest-style with mocked Prisma client
- **Mocking**: Use `@/lib/test-utils/prisma-mock` and `@/lib/test-utils/auth-mock`

### Running Tests

```bash
npm test                                          # Run all tests
npx jest <path> --no-watchman --runInBand        # Run specific tests
npm test -- --coverage                           # Run with coverage report
```

## Testing Best Practices

1. **Write tests before implementation** - Always start with failing tests
2. **Test isolation** - Each test must be independent
3. **Descriptive names** - Test names should clearly explain what is being tested
4. **Arrange-Act-Assert** - Structure tests with clear setup, execution, verification
5. **Mock external dependencies** - Use mocks for database, auth, and APIs
6. **Test edge cases** - Include failure paths and boundary conditions
7. **Keep tests fast** - Avoid slow operations, use mocks instead

## Project Structure

```
/app              - Next.js application (pages, layouts, API routes)
/components       - React components (auth, dashboard, UI, etc.)
/lib              - Utilities and helpers
/prisma           - Database schema and migrations
/__tests__        - Test files (integration, unit, components)
/docs             - Documentation
```

## Database

- **ORM**: Prisma
- **Schema**: Located at `/prisma/schema.prisma`
- **Migrations**: Located at `/prisma/migrations/`
- **Seed**: `/prisma/seed.ts` for sample data

Always update Prisma schema and generate migrations when modifying database models.

## API Routes

- Located at `/app/api/[feature]/route.ts`
- Use Prisma for database operations
- Implement proper error handling and validation
- All routes should have comprehensive integration tests
- Follow RESTful conventions where possible

## Component Standards

- Located in `/components/[feature]/`
- Use TypeScript for type safety
- Write component tests before implementation
- Use React Testing Library for component testing
- Support loading and error states
- Use accessibility best practices (ARIA labels, semantic HTML)

## Key Implemented Features

### Rules Engine & Automation
- 8 trigger types and 8 action types
- Pre-built rule templates
- Async fire-and-forget execution
- 112/112 API tests passing

### Recipe Management
- Manual creation and URL import with Schema.org extraction
- Support for all major recipe sites
- Dynamic ingredient/instruction management
- 93/93 tests passing

### Push Notifications & PWA
- Web Push API integration with VAPID keys
- Service Worker with cache-first strategy
- Offline support with IndexedDB queue
- 26/26 API tests passing
- 10 notification types configured

### Communication Board
- User post creation and management
- 76 API and component tests

### Routines & Morning Checklists
- Complete routine CRUD operations
- Checklist item management
- Full API and UI implementation

## Code Quality

- Use TypeScript for type safety
- Follow ESLint configuration
- Format code with Prettier
- Include JSDoc comments for complex functions
- Keep functions small and focused
- Use meaningful variable names

## Git & Version Control

- Commit messages should be clear and descriptive
- Include feature/fix prefixes (e.g., "feat:", "fix:")
- Reference related issues when applicable
- Keep commits atomic and focused

## Documentation

- Update relevant documentation files when implementing features
- Include usage examples for new APIs
- Document environment variables needed
- Add README sections for complex features

## When Assisting with Code

1. **Suggest tests first** - Ask about test cases before implementation
2. **Consider TDD principles** - Remind about Red-Green-Refactor cycle
3. **Maintain consistency** - Follow existing code patterns
4. **Think about edge cases** - Suggest test cases for boundary conditions
5. **Type safety first** - Use TypeScript types appropriately
6. **Error handling** - Ensure proper error handling and logging
7. **Performance** - Suggest optimizations when relevant
8. **Accessibility** - Include a11y considerations in UI changes

## Common Development Commands

```bash
npm install              # Install dependencies
npm run dev             # Start development server
npm test                # Run tests
npm run build           # Build for production
npm run lint            # Run ESLint
npm run format          # Format code with Prettier
npx prisma migrate dev  # Create and apply migrations
npx prisma generate     # Generate Prisma Client
```

## Debugging Tips

- Use `console.log()` or debugger for troubleshooting
- Check test output for specific failure reasons
- Review Prisma logs with `DEBUG="prisma:*"`
- Check browser dev tools for frontend issues
- Review server logs for API issues

## Security Considerations

- Validate and sanitize all user inputs
- Check authentication/authorization on protected routes
- Use environment variables for sensitive data
- Implement rate limiting for API endpoints
- Log security-related events
- Review SECURITY.md for specific implementations

## Environment Variables

Configure in `.env` or `.env.local` (development):
- Database connection (`DATABASE_URL`)
- Authentication secrets (`NEXTAUTH_SECRET`, `NEXTAUTH_URL`)
- Push notification keys (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`)
- API endpoints and credentials
- Feature flags

## Performance Optimization

- Use Next.js image optimization
- Implement code splitting and lazy loading
- Cache database queries appropriately
- Optimize database queries with indexes
- Use React.memo for expensive components
- Implement pagination for large datasets

## Troubleshooting

If tests fail:
1. Check test error messages carefully
2. Verify mocks are set up correctly
3. Ensure test isolation (no shared state)
4. Check if implementation matches test expectations
5. Run single test to isolate issues

If builds fail:
1. Check TypeScript errors
2. Verify all imports are correct
3. Run linter to catch style issues
4. Check database migrations are applied
5. Ensure Prisma Client is generated

---

**Last Updated**: 2026-01-06

For additional context on the project's architecture, database schema, and feature roadmap, see the root `claude.md` file and documentation in the `/docs` directory.
