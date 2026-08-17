import { useCallback, useEffect, useState } from 'react'

interface UseRemoteResourceOptions {
  enabled?: boolean
  errorMessage?: string
}

interface UseRemoteResourceResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  setData: React.Dispatch<React.SetStateAction<T | null>>
}

export function useRemoteResource<T>(
  loader: () => Promise<T>,
  options: UseRemoteResourceOptions = {}
): UseRemoteResourceResult<T> {
  const { enabled = true, errorMessage = 'Failed to load' } = options
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!enabled) {
      setData(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await loader()
      setData(result)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : errorMessage)
    } finally {
      setLoading(false)
    }
  }, [loader, enabled, errorMessage])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return {
    data,
    loading,
    error,
    refetch,
    setData,
  }
}
