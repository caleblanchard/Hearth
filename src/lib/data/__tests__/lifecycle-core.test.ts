import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import {
  createMockSupabaseClient,
  resetSupabaseMocks,
} from '@/lib/test-utils/supabase-mock'
import {
  insertAuditLog,
  isLifecycleError,
  LifecycleError,
  writeAuditLog,
} from '@/lib/data/lifecycle-core'

function captureInsertPayload(
  client: ReturnType<typeof createMockSupabaseClient>
): Record<string, unknown> {
  const builder = client.from('audit_logs') as unknown as { insert: jest.Mock }
  return builder.insert.mock.calls[0][0] as Record<string, unknown>
}

describe('LifecycleError', () => {
  it('carries status and optional details', () => {
    const error = new LifecycleError(404, 'Not found', { reason: 'missing' })
    expect(error).toBeInstanceOf(Error)
    expect(error.status).toBe(404)
    expect(error.message).toBe('Not found')
    expect(error.details).toEqual({ reason: 'missing' })
    expect(error.name).toBe('LifecycleError')
  })

  it('omits details when not provided', () => {
    const error = new LifecycleError(403, 'Forbidden')
    expect(error.details).toBeUndefined()
  })
})

describe('isLifecycleError', () => {
  it('returns true for a real LifecycleError', () => {
    expect(isLifecycleError(new LifecycleError(400, 'bad'))).toBe(true)
  })

  it('returns true for structurally-typed objects (duck typing)', () => {
    expect(isLifecycleError({ status: 500, message: 'oops' })).toBe(true)
  })

  it('returns false for non-errors', () => {
    expect(isLifecycleError(null)).toBe(false)
    expect(isLifecycleError(undefined)).toBe(false)
    expect(isLifecycleError('text')).toBe(false)
    expect(isLifecycleError(42)).toBe(false)
    expect(isLifecycleError({})).toBe(false)
    expect(isLifecycleError({ status: '500', message: 'oops' })).toBe(false)
    expect(isLifecycleError({ status: 500 })).toBe(false)
  })
})

describe('insertAuditLog', () => {
  let client: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    client = createMockSupabaseClient()
  })

  afterEach(() => {
    resetSupabaseMocks(client)
  })

  it('builds a snake_case payload with defaults', async () => {
    await insertAuditLog(
      {
        familyId: 'family-1',
        memberId: 'member-1',
        action: 'CHORE_APPROVED',
        entityType: 'CHORE',
        entityId: 'chore-1',
      },
      client as never
    )

    expect(captureInsertPayload(client)).toEqual({
      family_id: 'family-1',
      member_id: 'member-1',
      action: 'CHORE_APPROVED',
      entity_type: 'CHORE',
      entity_id: 'chore-1',
      result: 'SUCCESS',
      metadata: null,
    })
  })

  it('defaults entityId and metadata to null and result to SUCCESS', async () => {
    await insertAuditLog(
      {
        familyId: 'family-1',
        memberId: null,
        action: 'GUEST_SESSION_STARTED',
        entityType: 'GUEST_SESSION',
      },
      client as never
    )

    const payload = captureInsertPayload(client)
    expect(payload.entity_id).toBeNull()
    expect(payload.metadata).toBeNull()
    expect(payload.result).toBe('SUCCESS')
    expect(payload.member_id).toBeNull()
  })

  it('includes previousValue and newValue when provided and omits them otherwise', async () => {
    await insertAuditLog(
      {
        familyId: 'family-1',
        memberId: 'member-1',
        action: 'SCREENTIME_ADJUSTED',
        entityType: 'SCREEN_TIME',
        previousValue: { minutes: 120 },
        newValue: { minutes: 90 },
        result: 'SUCCESS',
        metadata: { note: 'manual' },
      },
      client as never
    )

    const payload = captureInsertPayload(client)
    expect(payload.previous_value).toEqual({ minutes: 120 })
    expect(payload.new_value).toEqual({ minutes: 90 })
    expect(payload.metadata).toEqual({ note: 'manual' })
  })

  it('respects an explicit FAILURE result', async () => {
    await insertAuditLog(
      {
        familyId: 'family-1',
        memberId: 'member-1',
        action: 'AUTH_DENIED',
        entityType: 'GUEST_SESSION',
        result: 'DENIED',
      },
      client as never
    )

    expect(captureInsertPayload(client).result).toBe('DENIED')
  })

  it('throws when the insert errors', async () => {
    const builder = client.from('audit_logs')
    mockSupabaseInsertError(builder, 'boom')

    await expect(
      insertAuditLog(
        {
          familyId: 'family-1',
          memberId: 'member-1',
          action: 'CHORE_APPROVED',
          entityType: 'CHORE',
        },
        client as never
      )
    ).rejects.toMatchObject({ message: 'boom' })
  })
})

describe('writeAuditLog', () => {
  let client: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    client = createMockSupabaseClient()
  })

  it('resolves when the insert succeeds', async () => {
    await expect(
      writeAuditLog(
        {
          familyId: 'family-1',
          memberId: 'member-1',
          action: 'CHORE_APPROVED',
          entityType: 'CHORE',
        },
        client as never
      )
    ).resolves.toBeUndefined()
  })

  it('swallows insert failures instead of throwing', async () => {
    const builder = client.from('audit_logs')
    mockSupabaseInsertError(builder, 'boom')

    await expect(
      writeAuditLog(
        {
          familyId: 'family-1',
          memberId: 'member-1',
          action: 'CHORE_APPROVED',
          entityType: 'CHORE',
        },
        client as never
      )
    ).resolves.toBeUndefined()
  })
})

function mockSupabaseInsertError(builder: any, message: string) {
  builder.insert.mockResolvedValue({
    data: null,
    error: { message, code: 'ERROR', details: '', hint: '' },
  })
}