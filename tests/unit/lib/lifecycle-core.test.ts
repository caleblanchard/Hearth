jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('@/lib/auth/parent-authorization-context', () => ({
  resolveParentAuthorizationContext: jest.fn(),
  requireParentAuthorizationContext: jest.fn(),
  ParentAuthorizationContextError: class MockParentAuthorizationContextError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { logger } from '@/lib/logger'
import {
  insertAuditLog,
  writeAuditLog,
  requireParentContext,
  LifecycleError,
} from '@/lib/data/lifecycle-core'

const {
  requireParentAuthorizationContext: mockRequireParentAuthorizationContext,
} = jest.requireMock('@/lib/auth/parent-authorization-context')
const { createClient: mockCreateClient } = jest.requireMock('@/lib/supabase/server')

const mockInsert = jest.fn()

function mockSupabaseClient() {
  return {
    from: jest.fn(() => ({
      insert: mockInsert,
    })),
  }
}

const validInput = {
  familyId: 'family-1',
  memberId: 'member-2',
  action: 'ROUTINE_COMPLETED' as const,
  entityType: 'ROUTINE' as const,
  entityId: 'routine-9',
  metadata: { routineName: 'Morning' },
}

describe('lifecycle-core audit layer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockInsert.mockReset()
  })

  describe('insertAuditLog', () => {
    it('builds the typed DB payload with canonical defaults', async () => {
      mockInsert.mockResolvedValue({ data: null, error: null })
      mockCreateClient.mockResolvedValue(mockSupabaseClient())

      await insertAuditLog(validInput)

      expect(mockCreateClient).toHaveBeenCalled()
      const supabase = await mockCreateClient.mock.results[0].value
      expect(supabase.from).toHaveBeenCalledWith('audit_logs')
      expect(mockInsert).toHaveBeenCalledWith({
        family_id: 'family-1',
        member_id: 'member-2',
        action: 'ROUTINE_COMPLETED',
        entity_type: 'ROUTINE',
        entity_id: 'routine-9',
        result: 'SUCCESS',
        metadata: { routineName: 'Morning' },
      })
    })

    it('defaults entity_id and result to null/SUCCESS when not provided', async () => {
      mockInsert.mockResolvedValue({ data: null, error: null })
      mockCreateClient.mockResolvedValue(mockSupabaseClient())

      await insertAuditLog({
        familyId: 'family-1',
        memberId: null,
        action: 'PROJECT_CREATED',
        entityType: 'PROJECT',
      })

      expect(mockInsert).toHaveBeenCalledWith({
        family_id: 'family-1',
        member_id: null,
        action: 'PROJECT_CREATED',
        entity_type: 'PROJECT',
        entity_id: null,
        result: 'SUCCESS',
        metadata: null,
      })
    })

    it('propagates the insert error', async () => {
      mockInsert.mockResolvedValue({ data: null, error: { message: 'boom' } })
      mockCreateClient.mockResolvedValue(mockSupabaseClient())

      await expect(insertAuditLog(validInput)).rejects.toEqual({ message: 'boom' })
    })

    it('accepts every canonical entity type value', async () => {
      mockInsert.mockResolvedValue({ data: null, error: null })
      mockCreateClient.mockResolvedValue(mockSupabaseClient())

      const entityTypes = [
        'SCREENTIME_ALLOWANCE',
        'SCREEN_TIME',
        'ROUTINE',
        'PROJECT',
        'MEAL_PLAN',
        'DOCUMENT',
        'COMMUNICATION_POST',
        'GUEST_SESSION',
        'GUEST_INVITE',
        'PET',
        'HEALTH_EVENT',
        'SICK_MODE_INSTANCE',
        'SICK_MODE_SETTINGS',
        'AUTOMATION_RULE',
        'REWARD',
        'KIOSK_SETTINGS',
      ] as const

      for (const entityType of entityTypes) {
        await insertAuditLog({ familyId: 'f', memberId: null, action: 'ROUTINE_COMPLETED', entityType })
        expect(mockInsert).toHaveBeenCalled()
        mockInsert.mockClear()
      }
    })
  })

  describe('writeAuditLog', () => {
    it('swallows insert failures and logs a warning instead of throwing', async () => {
      mockInsert.mockResolvedValue({ data: null, error: { message: 'audit down' } })
      mockCreateClient.mockResolvedValue(mockSupabaseClient())

      await expect(writeAuditLog(validInput)).resolves.toBeUndefined()
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to write audit log',
        expect.objectContaining({ error: { message: 'audit down' } })
      )
    })

    it('does not log a warning on success', async () => {
      mockInsert.mockResolvedValue({ data: null, error: null })
      mockCreateClient.mockResolvedValue(mockSupabaseClient())

      await writeAuditLog(validInput)
      expect(logger.warn).not.toHaveBeenCalled()
    })
  })

  describe('requireParentContext', () => {
    it('maps a parent-authorization 403 to a LifecycleError with the default message', async () => {
      mockRequireParentAuthorizationContext.mockRejectedValue(
        new (jest.requireMock('@/lib/auth/parent-authorization-context').ParentAuthorizationContextError)(
          403,
          'Forbidden - Parent access required'
        )
      )

      await expect(requireParentContext()).rejects.toEqual(
        expect.objectContaining({ status: 403, message: 'Forbidden - Parent access required' })
      )
      await expect(requireParentContext()).rejects.toBeInstanceOf(LifecycleError)
    })

    it('propagates the caller-provided forbiddenMessage through to the auth layer', async () => {
      mockRequireParentAuthorizationContext.mockRejectedValue(
        new Error('never reached')
      )

      await requireParentContext('Cannot view other members status').catch(() => {})

      expect(mockRequireParentAuthorizationContext).toHaveBeenCalledWith({
        forbiddenMessage: 'Cannot view other members status',
      })
    })
  })
})
