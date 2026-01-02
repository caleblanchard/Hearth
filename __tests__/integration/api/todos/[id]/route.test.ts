// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock'

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
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
import { NextRequest } from 'next/server'
import { PATCH, DELETE } from '@/app/api/todos/[id]/route'
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock'
import { TodoStatus } from '@/app/generated/prisma'

const { auth } = require('@/lib/auth')

describe('/api/todos/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetPrismaMock()
  })

  describe('PATCH', () => {
    const todoId = 'todo-1'
    const mockTodo = {
      id: todoId,
      familyId: 'family-1',
      title: 'Test Todo',
      status: TodoStatus.PENDING,
      completedAt: null,
    }

    const mockUpdatedTodo = {
      ...mockTodo,
      title: 'Updated Todo',
      status: TodoStatus.COMPLETED,
      completedAt: new Date(),
      createdBy: {
        id: 'parent-1',
        name: 'Parent One',
      },
      assignedTo: null,
    }

    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/todos/123', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated Todo' }),
      })

      const response = await PATCH(request, { params: { id: todoId } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if todo not found', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      prismaMock.todoItem.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/todos/123', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated Todo' }),
      })

      const response = await PATCH(request, { params: { id: todoId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Todo not found')
    })

    it('should return 403 if todo belongs to different family', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      prismaMock.todoItem.findUnique.mockResolvedValue({
        ...mockTodo,
        familyId: 'different-family',
      } as any)

      const request = new NextRequest('http://localhost/api/todos/123', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated Todo' }),
      })

      const response = await PATCH(request, { params: { id: todoId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should update todo successfully', async () => {
      const session = mockChildSession({ user: { familyId: 'family-1' } })
      auth.mockResolvedValue(session)

      prismaMock.todoItem.findUnique.mockResolvedValue({
        ...mockTodo,
        familyId: session.user.familyId,
      } as any)
      prismaMock.todoItem.update.mockResolvedValue(mockUpdatedTodo as any)

      const request = new NextRequest('http://localhost/api/todos/123', {
        method: 'PATCH',
        body: JSON.stringify({
          title: 'Updated Todo',
          status: TodoStatus.COMPLETED,
        }),
      })

      const response = await PATCH(request, { params: { id: todoId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.todo).toEqual(mockUpdatedTodo)
      expect(data.message).toBe('Todo updated successfully')

      expect(prismaMock.todoItem.update).toHaveBeenCalledWith({
        where: { id: todoId },
        data: {
          title: 'Updated Todo',
          status: TodoStatus.COMPLETED,
          completedAt: expect.any(Date),
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
    })

    it('should set completedAt when status is COMPLETED', async () => {
      const session = mockChildSession({ user: { familyId: 'family-1' } })
      auth.mockResolvedValue(session)

      prismaMock.todoItem.findUnique.mockResolvedValue({
        ...mockTodo,
        familyId: session.user.familyId,
      } as any)
      prismaMock.todoItem.update.mockResolvedValue({
        ...mockTodo,
        status: TodoStatus.COMPLETED,
        completedAt: new Date(),
      } as any)

      const request = new NextRequest('http://localhost/api/todos/123', {
        method: 'PATCH',
        body: JSON.stringify({ status: TodoStatus.COMPLETED }),
      })

      const response = await PATCH(request, { params: { id: todoId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.todo.completedAt).toBeDefined()
    })

    it('should return 500 on error', async () => {
      const session = mockChildSession({ user: { familyId: 'family-1' } })
      auth.mockResolvedValue(session)

      const mockTodoWithFamily = {
        ...mockTodo,
        familyId: session.user.familyId,
      }
      prismaMock.todoItem.findUnique.mockResolvedValue(mockTodoWithFamily as any)
      prismaMock.todoItem.update.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/todos/123', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated Todo' }),
      })

      const response = await PATCH(request, { params: { id: todoId } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update todo')
    })
  })

  describe('DELETE', () => {
    const todoId = 'todo-1'
    const mockTodo = {
      id: todoId,
      familyId: 'family-1',
      title: 'Test Todo',
    }

    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/todos/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: todoId } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if todo not found', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      prismaMock.todoItem.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/todos/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: todoId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Todo not found')
    })

    it('should return 403 if todo belongs to different family', async () => {
      const session = mockChildSession()
      auth.mockResolvedValue(session)

      prismaMock.todoItem.findUnique.mockResolvedValue({
        ...mockTodo,
        familyId: 'different-family',
      } as any)

      const request = new NextRequest('http://localhost/api/todos/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: todoId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should delete todo successfully', async () => {
      const session = mockChildSession({ user: { familyId: 'family-1' } })
      auth.mockResolvedValue(session)

      prismaMock.todoItem.findUnique.mockResolvedValue({
        ...mockTodo,
        familyId: session.user.familyId,
      } as any)
      prismaMock.todoItem.delete.mockResolvedValue(mockTodo as any)

      const request = new NextRequest('http://localhost/api/todos/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: todoId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Todo deleted successfully')

      expect(prismaMock.todoItem.delete).toHaveBeenCalledWith({
        where: { id: todoId },
      })
    })

    it('should return 500 on error', async () => {
      const session = mockChildSession({ user: { familyId: 'family-1' } })
      auth.mockResolvedValue(session)

      prismaMock.todoItem.findUnique.mockResolvedValue({
        ...mockTodo,
        familyId: session.user.familyId,
      } as any)
      prismaMock.todoItem.delete.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/todos/123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: todoId } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete todo')
    })
  })
})
