// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock'

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
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/todos/route'
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock'
import { TodoStatus } from '@/app/generated/prisma'

const { logger } = require('@/lib/logger')

describe('/api/todos', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/todos')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return active todos by default', async () => {
      const session = mockChildSession()

      const mockTodos = [
        {
          id: 'todo-1',
          title: 'Test Todo',
          status: TodoStatus.PENDING,
          familyId: session.user.familyId,
          createdBy: { id: 'user-1', name: 'User 1' },
          assignedTo: null,
        },
      ]

      prismaMock.todoItem.findMany.mockResolvedValue(mockTodos as any)
      prismaMock.todoItem.count.mockResolvedValue(mockTodos.length)

      const request = new NextRequest('http://localhost/api/todos')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual(mockTodos)
      expect(prismaMock.todoItem.findMany).toHaveBeenCalled()
      expect(prismaMock.todoItem.count).toHaveBeenCalled()
    })

    it('should filter by completed todos', async () => {
      const session = mockChildSession()

      prismaMock.todoItem.findMany.mockResolvedValue([])
      prismaMock.todoItem.count.mockResolvedValue(0)

      const request = new NextRequest('http://localhost/api/todos?filter=completed')
      await GET(request)

      expect(prismaMock.todoItem.findMany).toHaveBeenCalled()
      expect(prismaMock.todoItem.count).toHaveBeenCalled()
    })

    it('should return all todos when filter=all', async () => {
      const session = mockChildSession()

      prismaMock.todoItem.findMany.mockResolvedValue([])
      prismaMock.todoItem.count.mockResolvedValue(0)

      const request = new NextRequest('http://localhost/api/todos?filter=all')
      await GET(request)

      expect(prismaMock.todoItem.findMany).toHaveBeenCalled()
      expect(prismaMock.todoItem.count).toHaveBeenCalled()
    })
  })

  describe('POST', () => {
    const validTodoData = {
      title: 'New Todo',
      description: 'Test description',
      assignedToId: 'child-1',
      dueDate: '2025-01-20',
      priority: 'HIGH',
      category: 'CHORES',
      notes: 'Test notes',
    }

    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/todos', {
        method: 'POST',
        body: JSON.stringify(validTodoData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if title is missing', async () => {
      const session = mockChildSession()

      const request = new NextRequest('http://localhost/api/todos', {
        method: 'POST',
        body: JSON.stringify({
          ...validTodoData,
          title: '',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Title is required')
    })

    it('should return 400 if title is only whitespace', async () => {
      const session = mockChildSession()

      const request = new NextRequest('http://localhost/api/todos', {
        method: 'POST',
        body: JSON.stringify({
          ...validTodoData,
          title: '   ',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Title is required')
    })

    it('should create todo successfully', async () => {
      const session = mockChildSession()

      const mockCreatedTodo = {
        id: 'todo-1',
        title: 'New Todo',
        familyId: session.user.familyId,
        createdById: session.user.id,
        status: TodoStatus.PENDING,
        createdBy: { id: session.user.id, name: session.user.name },
        assignedTo: { id: 'child-1', name: 'Child 1' },
      }

      prismaMock.todoItem.create.mockResolvedValue(mockCreatedTodo as any)

      const request = new NextRequest('http://localhost/api/todos', {
        method: 'POST',
        body: JSON.stringify(validTodoData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.todo).toBeDefined()
      expect(data.message).toBe('Todo created successfully')
      expect(prismaMock.todoItem.create).toHaveBeenCalledWith({
        data: {
          familyId: session.user.familyId,
          title: 'New Todo',
          description: 'Test description',
          createdById: session.user.id,
          assignedToId: 'child-1',
          dueDate: new Date('2025-01-20'),
          priority: 'HIGH',
          category: 'CHORES',
          status: TodoStatus.PENDING,
          notes: 'Test notes',
        },
        include: expect.objectContaining({
          createdBy: expect.any(Object),
          assignedTo: expect.any(Object),
        }),
      })
    })

    it('should trim title', async () => {
      const session = mockChildSession()

      prismaMock.todoItem.create.mockResolvedValue({
        id: 'todo-1',
        title: 'Trimmed Title',
      } as any)

      const request = new NextRequest('http://localhost/api/todos', {
        method: 'POST',
        body: JSON.stringify({
          title: '  Trimmed Title  ',
        }),
      })

      await POST(request)

      expect(prismaMock.todoItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Trimmed Title',
        }),
        include: expect.any(Object),
      })
    })

    it('should use default priority if not provided', async () => {
      const session = mockChildSession()

      prismaMock.todoItem.create.mockResolvedValue({
        id: 'todo-1',
        priority: 'MEDIUM',
      } as any)

      const request = new NextRequest('http://localhost/api/todos', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Todo',
        }),
      })

      await POST(request)

      expect(prismaMock.todoItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          priority: 'MEDIUM',
        }),
        include: expect.any(Object),
      })
    })

    it('should handle invalid JSON gracefully', async () => {
      const session = mockChildSession()

      const request = new NextRequest('http://localhost/api/todos', {
        method: 'POST',
        body: 'invalid json{',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Title is required')
    })
  })
})
