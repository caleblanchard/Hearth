import { act, renderHook, waitFor } from '@testing-library/react'
import { useApprovalRequestLifecycle } from '@/hooks/useApprovalRequestLifecycle'

global.fetch = jest.fn()

describe('useApprovalRequestLifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  it('loads approval requests, keeps read-only items unselectable, and refreshes after bulk approval', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          approvals: [
            {
              id: 'chore-chore-1',
              type: 'CHORE_COMPLETION',
              familyMemberId: 'child-1',
              familyMemberName: 'Alice Example',
              familyMemberAvatarUrl: null,
              title: 'Clean room',
              description: '',
              requestedAt: '2026-05-19T12:00:00.000Z',
              metadata: { credits: 10 },
              priority: 'NORMAL',
              actionable: true,
            },
            {
              id: 'shopping-shopping-1',
              type: 'SHOPPING_ITEM',
              familyMemberId: 'child-2',
              familyMemberName: 'Bob Example',
              familyMemberAvatarUrl: null,
              title: 'Milk',
              description: '',
              requestedAt: '2026-05-18T12:00:00.000Z',
              metadata: {},
              priority: 'NORMAL',
              actionable: false,
            },
          ],
          total: 2,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: ['chore-chore-1'],
          failed: [],
          total: 1,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          approvals: [
            {
              id: 'shopping-shopping-1',
              type: 'SHOPPING_ITEM',
              familyMemberId: 'child-2',
              familyMemberName: 'Bob Example',
              familyMemberAvatarUrl: null,
              title: 'Milk',
              description: '',
              requestedAt: '2026-05-18T12:00:00.000Z',
              metadata: {},
              priority: 'NORMAL',
              actionable: false,
            },
          ],
          total: 1,
        }),
      })

    const { result } = renderHook(() => useApprovalRequestLifecycle())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.approvals).toHaveLength(2)

    act(() => {
      result.current.toggleSelectAll()
    })

    expect(Array.from(result.current.selectedIds)).toEqual(['chore-chore-1'])

    await act(async () => {
      await result.current.approveSelected()
    })

    expect(result.current.approvals).toHaveLength(1)
    expect(result.current.approvals[0]?.id).toBe('shopping-shopping-1')
    expect(result.current.selectedIds.size).toBe(0)
    expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/approvals/bulk-approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemIds: ['chore-chore-1'] }),
    })
  })
})
