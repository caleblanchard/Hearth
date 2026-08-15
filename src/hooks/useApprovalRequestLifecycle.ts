import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  ApprovalRequestDecisionResult,
  ApprovalRequestItem,
  ApprovalRequestQueueFilter,
} from '@/types/approval-request-lifecycle'
import {
  approveApprovalRequests,
  denyApprovalRequests,
  fetchApprovalRequests,
} from '@/lib/approval-request-lifecycle-client'

export function useApprovalRequestLifecycle(
  initialFilter: ApprovalRequestQueueFilter = 'ALL'
) {
  const [approvals, setApprovals] = useState<ApprovalRequestItem[]>([])
  const [filter, setFilter] = useState<ApprovalRequestQueueFilter>(initialFilter)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await fetchApprovalRequests({ type: filter })
      setApprovals(result.approvals)
      setSelectedIds((previous) => {
        const validIds = new Set(
          result.approvals
            .filter((approval) => approval.actionable !== false)
            .map((approval) => approval.id)
        )
        return new Set(Array.from(previous).filter((id) => validIds.has(id)))
      })
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'Failed to load approvals'
      )
      setApprovals([])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const actionableIds = useMemo(
    () =>
      approvals
        .filter((approval) => approval.actionable !== false)
        .map((approval) => approval.id),
    [approvals]
  )

  const toggleSelect = useCallback(
    (id: string, selected: boolean) => {
      const approval = approvals.find((candidate) => candidate.id === id)
      if (approval?.actionable === false) return

      setSelectedIds((previous) => {
        const next = new Set(previous)
        if (selected) {
          next.add(id)
        } else {
          next.delete(id)
        }
        return next
      })
    },
    [approvals]
  )

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((previous) =>
      previous.size === actionableIds.length ? new Set() : new Set(actionableIds)
    )
  }, [actionableIds])

  const runDecision = useCallback(
    async (
      handler: (itemIds: string[]) => Promise<ApprovalRequestDecisionResult>,
      itemIds: string[]
    ) => {
      setProcessing(true)
      try {
        const result = await handler(itemIds)
        await refresh()
        setSelectedIds(new Set())
        return result
      } finally {
        setProcessing(false)
      }
    },
    [refresh]
  )

  const approveOne = useCallback(
    async (id: string) => runDecision(approveApprovalRequests, [id]),
    [runDecision]
  )

  const denyOne = useCallback(
    async (id: string) => runDecision(denyApprovalRequests, [id]),
    [runDecision]
  )

  const approveSelected = useCallback(
    async () => runDecision(approveApprovalRequests, Array.from(selectedIds)),
    [runDecision, selectedIds]
  )

  const denySelected = useCallback(
    async () => runDecision(denyApprovalRequests, Array.from(selectedIds)),
    [runDecision, selectedIds]
  )

  return {
    approvals,
    filter,
    setFilter,
    loading,
    processing,
    error,
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    refresh,
    approveOne,
    denyOne,
    approveSelected,
    denySelected,
  }
}
