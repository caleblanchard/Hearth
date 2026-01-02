// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock'

// Mock achievements
jest.mock('@/lib/achievements', () => ({
  initializeAchievements: jest.fn(),
}))

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

// NOW import the route after mocks are set up
import { POST } from '@/app/api/achievements/init/route'

const { initializeAchievements } = require('@/lib/achievements')

describe('/api/achievements/init', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('POST', () => {
    it('should initialize achievements successfully', async () => {
      initializeAchievements.mockResolvedValue(undefined)

      const response = await POST()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Achievements initialized')

      expect(initializeAchievements).toHaveBeenCalled()
    })

    it('should return 500 on error', async () => {
      initializeAchievements.mockRejectedValue(new Error('Initialization error'))

      const response = await POST()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to initialize achievements')
    })
  })
})
