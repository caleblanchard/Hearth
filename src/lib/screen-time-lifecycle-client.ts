import type {
  AdjustScreenTimeLifecycleBalanceInput,
  RequestScreenTimeLifecycleGraceInput,
  SaveScreenTimeLifecycleAllowanceInput,
  ScreenTimeLifecycleAdjustmentResult,
  ScreenTimeLifecycleAllowanceListQuery,
  ScreenTimeLifecycleAllowanceListResult,
  ScreenTimeLifecycleGraceRequestResult,
  ScreenTimeLifecycleGraceSettings,
  ScreenTimeLifecycleGraceStatus,
  ScreenTimeLifecycleMemberAllowanceResult,
  ScreenTimeLifecycleTypeRecord,
  UpdateScreenTimeLifecycleGraceSettingsInput,
  UpdateScreenTimeLifecycleTypeInput,
} from '@/types/screen-time-lifecycle'
import { apiRequest, buildQueryString } from '@/lib/api-client'

export async function fetchScreenTimeLifecycleTypesClient() {
  const data = await apiRequest<{ types: ScreenTimeLifecycleTypeRecord[] }>('/api/screentime/types')
  return data.types
}

export async function createScreenTimeLifecycleTypeClient(input: {
  name: string
  description?: string | null
}) {
  const data = await apiRequest<{
    success: true
    type: ScreenTimeLifecycleTypeRecord
  }>('/api/screentime/types', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.type
}

export async function updateScreenTimeLifecycleTypeClient(
  typeId: string,
  input: UpdateScreenTimeLifecycleTypeInput
) {
  const data = await apiRequest<{
    success: true
    type: ScreenTimeLifecycleTypeRecord
  }>(`/api/screentime/types/${typeId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return data.type
}

export async function archiveScreenTimeLifecycleTypeClient(typeId: string) {
  await apiRequest<{ success: true }>(`/api/screentime/types/${typeId}`, {
    method: 'DELETE',
  })
}

export async function fetchScreenTimeLifecycleAllowancesClient(
  query: ScreenTimeLifecycleAllowanceListQuery = {}
) {
  const suffix = buildQueryString({
    memberId: query.memberId ?? null,
    screenTimeTypeId: query.screenTimeTypeId ?? null,
  })
  return apiRequest<ScreenTimeLifecycleAllowanceListResult>(
    `/api/screentime/allowances${suffix}`
  )
}

export async function fetchScreenTimeLifecycleAllowancesForMemberClient(
  memberId: string
) {
  return apiRequest<ScreenTimeLifecycleMemberAllowanceResult>(
    `/api/screentime/allowances/${memberId}`
  )
}

export async function saveScreenTimeLifecycleAllowanceClient(
  input: SaveScreenTimeLifecycleAllowanceInput
) {
  const data = await apiRequest<{
    success: true
    allowance: ScreenTimeLifecycleAllowanceListResult['allowances'][number]
  }>('/api/screentime/allowances', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.allowance
}

export async function adjustScreenTimeLifecycleBalanceClient(
  input: AdjustScreenTimeLifecycleBalanceInput
) {
  return apiRequest<{ success: true; message: string } & ScreenTimeLifecycleAdjustmentResult>(
    '/api/screentime/adjust',
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  )
}

export async function fetchScreenTimeLifecycleGraceSettingsClient(memberId?: string) {
  const suffix = buildQueryString({ memberId })
  const data = await apiRequest<{ settings: ScreenTimeLifecycleGraceSettings }>(
    `/api/screentime/grace/settings${suffix}`
  )
  return data.settings
}

export async function updateScreenTimeLifecycleGraceSettingsClient(
  input: UpdateScreenTimeLifecycleGraceSettingsInput
) {
  const data = await apiRequest<{
    success: true
    settings: ScreenTimeLifecycleGraceSettings
  }>('/api/screentime/grace/settings', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
  return data.settings
}

export async function fetchScreenTimeLifecycleGraceStatusClient(memberId?: string) {
  const suffix = buildQueryString({ memberId })
  const data = await apiRequest<{ status: ScreenTimeLifecycleGraceStatus }>(
    `/api/screentime/grace/status${suffix}`
  )
  return data.status
}

export async function requestScreenTimeLifecycleGraceClient(
  input: RequestScreenTimeLifecycleGraceInput
) {
  return apiRequest<{ success: true; message: string } & ScreenTimeLifecycleGraceRequestResult>(
    '/api/screentime/grace/request',
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  )
}
