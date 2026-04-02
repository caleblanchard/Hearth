// @ts-nocheck
/**
 * Example Test: Supabase Mock Usage
 * 
 * This file demonstrates how to use the Supabase mock utilities
 * in integration and unit tests. It serves as documentation and
 * a validation that the mocks work correctly.
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import {
  createMockSupabaseClient,
  mockSupabaseSelect,
  mockSupabaseSingle,
  mockSupabaseInsert,
  mockSupabaseUpdate,
  mockSupabaseError,
  mockSupabaseRpc,
  MockSupabaseClient,
} from '../supabase-mock'
import {
  mockSupabaseParentSession,
  mockSupabaseChildSession,
  mockSupabaseParentUser,
  mockGetUserResponse,
  mockGetSessionResponse,
  mockAuthError,
  mockMultiFamilyUser,
} from '../supabase-auth-mock'

describe('Supabase Mock Utilities', () => {
  let mockClient: MockSupabaseClient

  beforeEach(() => {
    mockClient = createMockSupabaseClient()
  })

  describe('Query Mocks', () => {
    it('should mock a SELECT query', async () => {
      const mockData = [
        { id: '1', name: 'Test Family' },
        { id: '2', name: 'Another Family' },
      ]

      mockSupabaseSelect(mockClient, mockData)

      const result: any = await mockClient
        .from('families')
        .select('*')
      
      const { data, error } = result

      expect(error).toBeNull()
      expect(data).toEqual(mockData)
    })

    it('should mock a SELECT with single()', async () => {
      const mockData = { id: '1', name: 'Test Family' }

      mockSupabaseSingle(mockClient, mockData)

      const queryBuilder = mockClient.from('families')
      queryBuilder.single.mockResolvedValue({ data: mockData, error: null })

      const { data, error } = await queryBuilder
        .select('*')
        .eq('id', '1')
        .single()

      expect(error).toBeNull()
      expect(data).toEqual(mockData)
    })

    it('should mock an INSERT query', async () => {
      const newFamily = { id: '3', name: 'New Family' }

      mockSupabaseInsert(mockClient, newFamily)

      const queryBuilder = mockClient.from('families')
      const insertBuilder = queryBuilder.insert({ name: 'New Family' })
      
      // Mock the select on the insert result
      insertBuilder.select.mockResolvedValue({ data: [newFamily], error: null })

      const { data, error } = await insertBuilder.select()

      expect(error).toBeNull()
      expect(data).toEqual([newFamily])
    })

    it('should mock an UPDATE query', async () => {
      const updatedFamily = { id: '1', name: 'Updated Family' }

      const queryBuilder = mockClient.from('families')
      const updateMock = jest.fn().mockReturnValue({
        ...queryBuilder,
        eq: jest.fn().mockReturnValue({
          ...queryBuilder,
          select: jest.fn().mockResolvedValue({ data: [updatedFamily], error: null }),
        }),
      })
      queryBuilder.update = updateMock

      const { data, error } = await mockClient
        .from('families')
        .update({ name: 'Updated Family' })
        .eq('id', '1')
        .select()

      expect(error).toBeNull()
      expect(data).toEqual([updatedFamily])
    })

    it('should mock a Supabase error', async () => {
      const errorMessage = 'Row not found'
      const errorObj = { message: errorMessage, code: 'PGRST116', details: '', hint: '' }
      
      // Create a fresh query builder for this test
      const testQueryBuilder: any = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: errorObj }),
      }
      
      // Override the from method for this test
      mockClient.from = jest.fn().mockReturnValue(testQueryBuilder) as any

      const { data, error } = await mockClient
        .from('families')
        .select('*')
        .eq('id', 'nonexistent')
        .single()

      expect(data).toBeNull()
      expect(error).not.toBeNull()
      expect(error?.message).toBe(errorMessage)
      expect(error?.code).toBe('PGRST116')
    })

    it('should mock an RPC call', async () => {
      const rpcResult = { success: true, count: 5 }

      mockSupabaseRpc(mockClient, 'complete_chore_with_credits', rpcResult)

      const { data, error } = await mockClient.rpc('complete_chore_with_credits', {
        p_assignment_id: '123',
        p_completed_by: '456',
      })

      expect(error).toBeNull()
      expect(data).toEqual(rpcResult)
    })
  })

  describe('Auth Mocks', () => {
    it('should create a parent session', () => {
      const session = mockSupabaseParentSession()

      expect(session.user.id).toBe('parent-test-123')
      expect(session.user.email).toBe('parent@test.com')
      expect(session.user.app_metadata?.family_id).toBe('family-test-123')
      expect(session.access_token).toBe('mock-access-token-parent')
    })

    it('should create a child session', () => {
      const session = mockSupabaseChildSession()

      expect(session.user.id).toBe('child-test-123')
      expect(session.user.email).toBe('child@test.com')
      expect(session.user.app_metadata?.family_id).toBe('family-test-123')
      expect(session.access_token).toBe('mock-access-token-child')
    })

    it('should override session properties', () => {
      const customUser = mockSupabaseParentUser({
        id: 'custom-user-id',
        email: 'custom@test.com',
        app_metadata: {
          family_id: 'custom-family-id',
        },
      })

      const session = mockSupabaseParentSession({
        user: customUser,
      })

      expect(session.user.id).toBe('custom-user-id')
      expect(session.user.email).toBe('custom@test.com')
      expect(session.user.app_metadata?.family_id).toBe('custom-family-id')
      // Should preserve other default metadata when not overridden
      expect(session.user.user_metadata?.name).toBe('Test Parent')
    })

    it('should mock getUser response', () => {
      const session = mockSupabaseParentSession()
      const response = mockGetUserResponse(session.user)

      expect(response.data.user).toEqual(session.user)
      expect(response.error).toBeNull()
    })

    it('should mock getSession response', () => {
      const session = mockSupabaseParentSession()
      const response = mockGetSessionResponse(session)

      expect(response.data.session).toEqual(session)
      expect(response.error).toBeNull()
    })

    it('should mock auth errors', () => {
      const error = mockAuthError('Invalid credentials', 401)

      expect(error.data.user).toBeNull()
      expect(error.data.session).toBeNull()
      expect(error.error.message).toBe('Invalid credentials')
      expect(error.error.status).toBe(401)
    })

    it('should create multi-family user', () => {
      const familyIds = ['family-1', 'family-2', 'family-3']
      const user = mockMultiFamilyUser(familyIds)

      expect(user.app_metadata?.family_ids).toEqual(familyIds)
      expect(user.app_metadata?.family_id).toBe('family-1') // Primary
    })
  })

  describe('Chainable Query Builder', () => {
    it('should support chaining filters', async () => {
      const mockData = [{ id: '1', name: 'Active Family', is_active: true }]

      const queryBuilder = mockClient.from('families')
      queryBuilder.select.mockReturnValue({
        ...queryBuilder,
        eq: jest.fn().mockReturnValue({
          ...queryBuilder,
          order: jest.fn().mockReturnValue({
            ...queryBuilder,
            limit: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      } as any)

      const { data, error } = await mockClient
        .from('families')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(10)

      expect(mockClient.from).toHaveBeenCalledWith('families')
      expect(data).toEqual(mockData)
    })

    it('should support nested selects', async () => {
      const mockData = [
        {
          id: '1',
          name: 'Test Family',
          members: [
            { id: 'm1', name: 'Parent' },
            { id: 'm2', name: 'Child' },
          ],
        },
      ]

      const queryBuilder = mockClient.from('families')
      queryBuilder.select.mockReturnValue({
        ...queryBuilder,
        eq: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      } as any)

      const { data, error } = await mockClient
        .from('families')
        .select('*, members:family_members(*)')
        .eq('id', '1')

      expect(data).toEqual(mockData)
    })
  })

  describe('Auth Client Methods', () => {
    it('should mock auth.getUser()', async () => {
      const user = mockSupabaseParentSession().user
      mockClient.auth.getUser.mockResolvedValue(mockGetUserResponse(user))

      const { data, error } = await mockClient.auth.getUser()

      expect(error).toBeNull()
      expect(data.user).toEqual(user)
    })

    it('should mock auth.signInWithPassword()', async () => {
      const session = mockSupabaseParentSession()
      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: session.user, session },
        error: null,
      })

      const { data, error } = await mockClient.auth.signInWithPassword({
        email: 'parent@test.com',
        password: 'password123',
      })

      expect(error).toBeNull()
      expect(data.session).toEqual(session)
    })

    it('should mock auth.signOut()', async () => {
      mockClient.auth.signOut.mockResolvedValue({ error: null })

      const { error } = await mockClient.auth.signOut()

      expect(error).toBeNull()
    })
  })
})
