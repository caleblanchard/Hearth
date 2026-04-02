// Set up mocks BEFORE imports
import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock'
import { mockParentSession } from '@/lib/test-utils/auth-mock'

// Mock logger to avoid noisy output
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

// Mock Supabase server client helpers
jest.mock('@/lib/supabase/server', () => {
  const actual = jest.requireActual('@/lib/supabase/server')
  return {
    ...actual,
    createClient: jest.fn(() => ({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'auth-user-1' } }, error: null }),
      },
    })),
    getAuthContext: jest.fn(async () => mockParentSession()),
  }
})

// Mock Supabase admin client
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn(function (this: any, table: string) {
      const tableMap: Record<string, any> = {
        families: {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'family-123',
              name: 'Test Family',
              timezone: 'America/New_York',
              location: null,
              latitude: null,
              longitude: null,
              settings: {},
            },
            error: null,
          }),
        },
        family_members: {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'member-123',
              family_id: 'family-123',
              auth_user_id: 'auth-user-1',
              name: 'John Doe',
              role: 'PARENT',
              is_active: true,
            },
            error: null,
          }),
        },
        module_configurations: {
          upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
        },
        system_config: {
          upsert: jest.fn().mockResolvedValue({
            data: { id: 'system', onboarding_complete: true },
            error: null,
          }),
        },
      }
      return tableMap[table]
    }),
  })),
}))

import { NextRequest } from 'next/server'
import { POST as onboardingSetup } from '@/app/api/setup/onboarding/route'

describe('POST /api/setup/onboarding - module selection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetDbMock()
  })

  it('enables only selected modules and disables the rest', async () => {
    const selectedModules = ['CHORES', 'SCREEN_TIME', 'RECIPES']

    const request = new NextRequest('http://localhost/api/setup/onboarding', {
      method: 'POST',
      body: JSON.stringify({
        familyName: 'Test Family',
        timezone: 'America/New_York',
        weekStartDay: 'SUNDAY',
        selectedModules,
      }),
    })

    const response = await onboardingSetup(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.modules.enabled).toEqual(selectedModules)
    expect(data.modules.count).toBe(selectedModules.length)
  })
})
