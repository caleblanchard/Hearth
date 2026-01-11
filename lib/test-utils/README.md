# Supabase Test Utilities

This directory contains mock utilities for testing Supabase-based code with Jest.

## Files

- **`supabase-mock.ts`** - Mock Supabase client with chainable query builder
- **`supabase-auth-mock.ts`** - Mock authentication contexts (users, sessions)
- **`__tests__/supabase-mocks.test.ts`** - Example tests demonstrating usage

## Quick Start

### Mocking Queries

```typescript
import { createMockSupabaseClient } from '@/lib/test-utils/supabase-mock'

const mockClient = createMockSupabaseClient()

// Mock a SELECT query
const mockData = [{ id: '1', name: 'Test Family' }]
const queryBuilder = mockClient.from('families')
queryBuilder.select.mockResolvedValue({ data: mockData, error: null })

const { data } = await mockClient.from('families').select('*')
// data === mockData
```

### Mocking Auth

```typescript
import { 
  mockSupabaseParentSession,
  mockSupabaseChildSession 
} from '@/lib/test-utils/supabase-auth-mock'

// Create a parent session
const parentSession = mockSupabaseParentSession()
console.log(parentSession.user.id) // 'parent-test-123'

// Create a child session
const childSession = mockSupabaseChildSession()
console.log(childSession.user.id) // 'child-test-123'

// Override properties
const customSession = mockSupabaseParentSession({
  user: mockSupabaseParentUser({
    id: 'custom-id',
    email: 'custom@test.com',
  }),
})
```

## Common Patterns

### Testing API Routes

```typescript
import { createMockSupabaseClient } from '@/lib/test-utils/supabase-mock'
import { mockSupabaseParentSession } from '@/lib/test-utils/supabase-auth-mock'

describe('GET /api/families', () => {
  it('should return families for authenticated user', async () => {
    const mockClient = createMockSupabaseClient()
    const session = mockSupabaseParentSession()
    
    // Mock auth
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: session.user },
      error: null,
    })
    
    // Mock query
    const mockFamilies = [{ id: 'family-1', name: 'Test Family' }]
    const queryBuilder = mockClient.from('families')
    queryBuilder.select.mockResolvedValue({ 
      data: mockFamilies, 
      error: null 
    })
    
    // Test your API route...
  })
})
```

### Testing Components

```typescript
import { render, screen } from '@testing-library/react'
import { createMockSupabaseClient } from '@/lib/test-utils/supabase-mock'
import FamilyList from '@/components/FamilyList'

it('should display families', async () => {
  const mockClient = createMockSupabaseClient()
  const mockFamilies = [
    { id: '1', name: 'Family 1' },
    { id: '2', name: 'Family 2' },
  ]
  
  const queryBuilder = mockClient.from('families')
  queryBuilder.select.mockResolvedValue({ 
    data: mockFamilies, 
    error: null 
  })
  
  render(<FamilyList supabaseClient={mockClient} />)
  
  expect(await screen.findByText('Family 1')).toBeInTheDocument()
  expect(await screen.findByText('Family 2')).toBeInTheDocument()
})
```

### Mocking Errors

```typescript
const errorObj = { 
  message: 'Row not found', 
  code: 'PGRST116',
  details: '',
  hint: ''
}

const testQueryBuilder: any = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: errorObj }),
}

mockClient.from = jest.fn().mockReturnValue(testQueryBuilder)

const { data, error } = await mockClient
  .from('families')
  .select('*')
  .eq('id', 'nonexistent')
  .single()

expect(error).toEqual(errorObj)
```

### Mocking RPC Calls

```typescript
import { mockSupabaseRpc } from '@/lib/test-utils/supabase-mock'

mockSupabaseRpc(mockClient, 'complete_chore_with_credits', {
  success: true,
  credits_awarded: 10,
})

const { data } = await mockClient.rpc('complete_chore_with_credits', {
  p_assignment_id: '123',
  p_completed_by: '456',
})

expect(data.credits_awarded).toBe(10)
```

## API Reference

### Supabase Client Mock

#### `createMockSupabaseClient()`
Creates a complete mock of the Supabase client with all methods.

#### Helper Functions
- `mockSupabaseSelect(client, data)` - Mock SELECT query
- `mockSupabaseSingle(client, data)` - Mock SELECT with single()
- `mockSupabaseInsert(client, data)` - Mock INSERT query
- `mockSupabaseUpdate(client, data)` - Mock UPDATE query
- `mockSupabaseDelete(client)` - Mock DELETE query
- `mockSupabaseError(client, error)` - Mock error response
- `mockSupabaseRpc(client, functionName, data)` - Mock RPC call
- `resetSupabaseMocks(client)` - Reset all mocks

### Auth Mocks

#### User Creators
- `mockSupabaseParentUser(overrides?)` - Create parent user
- `mockSupabaseChildUser(overrides?)` - Create child user
- `mockMultiFamilyUser(familyIds, overrides?)` - Create user with multiple families

#### Session Creators
- `mockSupabaseParentSession(overrides?)` - Create parent session
- `mockSupabaseChildSession(overrides?)` - Create child session
- `mockSupabaseSession(role, overrides?)` - Create session by role
- `mockKioskSession(activeMemberId, overrides?)` - Create kiosk session

#### Response Helpers
- `mockGetUserResponse(user)` - Mock auth.getUser() response
- `mockGetSessionResponse(session)` - Mock auth.getSession() response
- `mockAuthError(message, status?)` - Mock auth error response

## Best Practices

1. **Always reset mocks between tests**
   ```typescript
   beforeEach(() => {
     mockClient = createMockSupabaseClient()
   })
   ```

2. **Use type-safe mocks**
   ```typescript
   const mockData: Family[] = [{ id: '1', name: 'Test' }]
   ```

3. **Test both success and error cases**
   ```typescript
   it('should handle errors gracefully', async () => {
     const errorObj = { message: 'Error', code: 'ERROR' }
     queryBuilder.select.mockResolvedValue({ data: null, error: errorObj })
     // ... test error handling
   })
   ```

4. **Mock only what you need**
   - Don't mock the entire Supabase client if you only need auth
   - Mock specific query chains for specific tests

5. **Keep mocks close to real behavior**
   - Use actual response structures
   - Include error objects with proper shape
   - Test chainable query patterns

## Migrating from Prisma Mocks

### Before (Prisma)
```typescript
import { prismaMock } from '@/lib/test-utils/prisma-mock'

prismaMock.family.findMany.mockResolvedValue(mockFamilies)
```

### After (Supabase)
```typescript
import { createMockSupabaseClient } from '@/lib/test-utils/supabase-mock'

const mockClient = createMockSupabaseClient()
const queryBuilder = mockClient.from('families')
queryBuilder.select.mockResolvedValue({ data: mockFamilies, error: null })
```

## Running Tests

```bash
# Run all mock utility tests
npm test -- lib/test-utils/__tests__/supabase-mocks.test.ts

# Run with coverage
npm test -- lib/test-utils/__tests__/supabase-mocks.test.ts --coverage
```

## Example: Full Integration Test

See `__tests__/supabase-mocks.test.ts` for comprehensive examples of all patterns.

---

**Last Updated:** January 9, 2026  
**Status:** ✅ Ready for use  
**Test Coverage:** 100% (18/18 tests passing)
