// Set up mocks BEFORE any imports
import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock'

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server'
import { GET, PUT, PATCH, DELETE } from '@/app/api/allowance/[id]/route'
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock'
import { Frequency } from '@/app/generated/prisma'

describe('/api/allowance/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetDbMock()
  })

  const mockSchedule = {
    id: 'schedule-1',
    memberId: 'child-1',
    amount: 500,
    frequency: Frequency.WEEKLY,
    dayOfWeek: 0,
    dayOfMonth: null,
    isActive: true,
    isPaused: false,
    startDate: new Date('2025-01-01'),
    endDate: null,
    lastProcessedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    member: {
      id: 'child-1',
      name: 'Child 1',
      familyId: 'family-test-123',
    },
  }

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {

      const response = await GET(
        new NextRequest('http://localhost/api/allowance/schedule-1'),
        { params: Promise.resolve({ id: 'schedule-1' }) }
      )
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return schedule by ID', async () => {
      dbMock.allowanceSchedule.findUnique.mockResolvedValue(mockSchedule as any)

      const response = await GET(
        new NextRequest('http://localhost/api/allowance/schedule-1'),
        { params: Promise.resolve({ id: 'schedule-1' }) }
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.schedule).toEqual(mockSchedule)
    })

    it('should return 404 if schedule not found or wrong family', async () => {
      dbMock.allowanceSchedule.findUnique.mockResolvedValue(null)

      const response = await GET(
        new NextRequest('http://localhost/api/allowance/schedule-1'),
        { params: Promise.resolve({ id: 'schedule-1' }) }
      )
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Allowance schedule not found')
    })
  })

  describe('PUT', () => {
    it('should return 403 if user is not a parent', async () => {

      const request = new NextRequest('http://localhost/api/allowance/schedule-1', {
        method: 'PUT',
        body: JSON.stringify({ amount: 600 }),
      })

      const response = await PUT(request, { params: Promise.resolve({ id: 'schedule-1' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should update allowance schedule', async () => {
      dbMock.allowanceSchedule.findUnique.mockResolvedValue(mockSchedule as any)

      const updatedSchedule = { ...mockSchedule, amount: 600 }
      dbMock.allowanceSchedule.update.mockResolvedValue(updatedSchedule as any)

      const request = new NextRequest('http://localhost/api/allowance/schedule-1', {
        method: 'PUT',
        body: JSON.stringify({
          amount: 600,
          frequency: 'WEEKLY',
          dayOfWeek: 1,
        }),
      })

      const response = await PUT(request, { params: Promise.resolve({ id: 'schedule-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.schedule.amount).toBe(600)
    })

    it('should validate amount is positive', async () => {
      dbMock.allowanceSchedule.findUnique.mockResolvedValue(mockSchedule as any)

      const request = new NextRequest('http://localhost/api/allowance/schedule-1', {
        method: 'PUT',
        body: JSON.stringify({ amount: -100 }),
      })

      const response = await PUT(request, { params: Promise.resolve({ id: 'schedule-1' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('positive')
    })
  })

  describe('PATCH', () => {
    it('should pause allowance schedule', async () => {
      dbMock.allowanceSchedule.findUnique.mockResolvedValue(mockSchedule as any)

      const pausedSchedule = { ...mockSchedule, isPaused: true }
      dbMock.allowanceSchedule.update.mockResolvedValue(pausedSchedule as any)

      const request = new NextRequest('http://localhost/api/allowance/schedule-1', {
        method: 'PATCH',
        body: JSON.stringify({ isPaused: true }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'schedule-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.schedule.isPaused).toBe(true)
    })

    it('should resume allowance schedule', async () => {
      const pausedSchedule = { ...mockSchedule, isPaused: true }
      dbMock.allowanceSchedule.findUnique.mockResolvedValue(pausedSchedule as any)

      const resumedSchedule = { ...mockSchedule, isPaused: false }
      dbMock.allowanceSchedule.update.mockResolvedValue(resumedSchedule as any)

      const request = new NextRequest('http://localhost/api/allowance/schedule-1', {
        method: 'PATCH',
        body: JSON.stringify({ isPaused: false }),
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'schedule-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.schedule.isPaused).toBe(false)
    })
  })

  describe('DELETE', () => {
    it('should deactivate allowance schedule', async () => {
      dbMock.allowanceSchedule.findUnique.mockResolvedValue(mockSchedule as any)

      const deactivatedSchedule = { ...mockSchedule, isActive: false }
      dbMock.allowanceSchedule.update.mockResolvedValue(deactivatedSchedule as any)

      const response = await DELETE(
        new NextRequest('http://localhost/api/allowance/schedule-1'),
        { params: Promise.resolve({ id: 'schedule-1' }) }
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(dbMock.allowanceSchedule.update).toHaveBeenCalledWith({
        where: { id: 'schedule-1' },
        data: { isActive: false },
      })
    })

    it('should return 404 if schedule not found', async () => {
      dbMock.allowanceSchedule.findUnique.mockResolvedValue(null)

      const response = await DELETE(
        new NextRequest('http://localhost/api/allowance/schedule-1'),
        { params: Promise.resolve({ id: 'schedule-1' }) }
      )
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Allowance schedule not found')
    })
  })
})
