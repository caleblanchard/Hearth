import { act, renderHook, waitFor } from '@testing-library/react'
import { useRemoteResource } from '@/hooks/useRemoteResource'

const stableLoader = jest.fn(async () => ({ ok: true }))

describe('useRemoteResource', () => {
  it('loads data on mount and exposes the loading lifecycle', async () => {
    const loader = jest.fn(async () => ({ id: 'rule-1', name: 'Test' }))

    const { result } = renderHook(() => useRemoteResource(loader))

    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(loader).toHaveBeenCalledTimes(1)
    expect(result.current.data).toEqual({ id: 'rule-1', name: 'Test' })
    expect(result.current.error).toBeNull()
  })

  it('surfaces an error message when the loader rejects', async () => {
    const loader = jest.fn(async () => {
      throw new Error('Failed to load rule')
    })

    const { result } = renderHook(() => useRemoteResource(loader))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load rule')
    expect(result.current.data).toBeNull()
  })

  it('preserves previously-loaded data when a refetch fails', async () => {
    const loader = jest
      .fn()
      .mockResolvedValueOnce({ version: 1 })
      .mockRejectedValueOnce(new Error('Network down'))

    const { result } = renderHook(() => useRemoteResource(loader))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual({ version: 1 })

    await act(async () => {
      await result.current.refetch()
    })

    expect(loader).toHaveBeenCalledTimes(2)
    expect(result.current.error).toBe('Network down')
    expect(result.current.data).toEqual({ version: 1 })
    expect(result.current.loading).toBe(false)
  })

  it('refetches when refetch is called', async () => {
    let callCount = 0
    const loader = jest.fn(async () => {
      callCount += 1
      return { version: callCount }
    })

    const { result } = renderHook(() => useRemoteResource(loader))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.refetch()
    })

    expect(loader).toHaveBeenCalledTimes(2)
    expect(result.current.data).toEqual({ version: 2 })
  })

  it('refetches when the loader identity changes', async () => {
    const loaderA = jest.fn(async () => ({ source: 'a' }))
    const loaderB = jest.fn(async () => ({ source: 'b' }))

    const { result, rerender } = renderHook(({ loader }) => useRemoteResource(loader), {
      initialProps: { loader: loaderA },
    })

    await waitFor(() => {
      expect(result.current.data).toEqual({ source: 'a' })
    })

    rerender({ loader: loaderB })

    await waitFor(() => {
      expect(result.current.data).toEqual({ source: 'b' })
    })

    expect(loaderA).toHaveBeenCalledTimes(1)
    expect(loaderB).toHaveBeenCalledTimes(1)
  })

  it('does not call the loader when disabled', async () => {
    const loader = jest.fn(async () => ({ id: 'x' }))

    const { result } = renderHook(() => useRemoteResource(loader, { enabled: false }))

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBeNull()
    expect(loader).not.toHaveBeenCalled()
  })

  it('starts loading when disabled becomes enabled', async () => {
    const loader = jest.fn(async () => ({ id: 'x' }))

    const { result, rerender } = renderHook(
      ({ enabled }) => useRemoteResource(loader, { enabled }),
      { initialProps: { enabled: false } }
    )

    expect(result.current.loading).toBe(false)

    rerender({ enabled: true })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(loader).toHaveBeenCalledTimes(1)
    expect(result.current.data).toEqual({ id: 'x' })
  })

  it('supports local data updates via setData', async () => {
    const loader = jest.fn(async () => ({ rules: [{ id: 'r1', enabled: true }] }))

    const { result } = renderHook(() => useRemoteResource(loader))

    await waitFor(() => {
      expect(result.current.data).toEqual({ rules: [{ id: 'r1', enabled: true }] })
    })

    act(() => {
      result.current.setData((current) =>
        current
          ? {
              rules: current.rules.map((rule: { id: string; enabled: boolean }) =>
                rule.id === 'r1' ? { ...rule, enabled: false } : rule
              ),
            }
          : current
      )
    })

    expect(result.current.data?.rules).toEqual([{ id: 'r1', enabled: false }])
  })

  it('keeps refetch stable across renders when the loader is stable', async () => {
    stableLoader.mockClear()

    const { result, rerender } = renderHook(() => useRemoteResource(stableLoader))

    await waitFor(() => {
      expect(result.current.data).toEqual({ ok: true })
    })

    const refetchBefore = result.current.refetch
    rerender()
    expect(result.current.refetch).toBe(refetchBefore)
    expect(stableLoader).toHaveBeenCalledTimes(1)
  })
})
