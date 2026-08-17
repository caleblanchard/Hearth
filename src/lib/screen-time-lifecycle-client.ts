import { createLifecycleClient } from '@/lib/lifecycle-client'
import type {
  AdjustScreenTimeLifecycleBalanceInput,
  CreateScreenTimeLifecycleTypeInput,
  SaveScreenTimeLifecycleAllowanceInput,
  ScreenTimeLifecycleAdjustmentResult,
  ScreenTimeLifecycleAllowanceListQuery,
  ScreenTimeLifecycleAllowanceListResult,
  ScreenTimeLifecycleAllowanceRecord,
  ScreenTimeLifecycleGraceRequestResult,
  ScreenTimeLifecycleGraceSettings,
  ScreenTimeLifecycleGraceStatus,
  ScreenTimeLifecycleMemberAllowanceResult,
  ScreenTimeLifecycleTypeRecord,
  RequestScreenTimeLifecycleGraceInput,
  UpdateScreenTimeLifecycleGraceSettingsInput,
  UpdateScreenTimeLifecycleTypeInput,
} from '@/types/screen-time-lifecycle'

const typesClient = createLifecycleClient<ScreenTimeLifecycleTypeRecord>({
  basePath: '/api/screentime/types',
  itemKey: 'type',
  listKey: 'types',
})

const allowancesClient = createLifecycleClient({ basePath: '/api/screentime/allowances' })

const screenTimeClient = createLifecycleClient({ basePath: '/api/screentime' })

const graceSettingsClient = createLifecycleClient<ScreenTimeLifecycleGraceSettings>({
  basePath: '/api/screentime/grace/settings',
  itemKey: 'settings',
})

const graceStatusClient = createLifecycleClient<ScreenTimeLifecycleGraceStatus>({
  basePath: '/api/screentime/grace/status',
  itemKey: 'status',
})

const graceRequestClient = createLifecycleClient({ basePath: '/api/screentime/grace/request' })

export function fetchScreenTimeLifecycleTypesClient(): Promise<ScreenTimeLifecycleTypeRecord[]> {
  return typesClient.list()
}

export function createScreenTimeLifecycleTypeClient(
  input: CreateScreenTimeLifecycleTypeInput,
): Promise<ScreenTimeLifecycleTypeRecord> {
  return typesClient.create(input)
}

export function updateScreenTimeLifecycleTypeClient(
  typeId: string,
  input: UpdateScreenTimeLifecycleTypeInput,
): Promise<ScreenTimeLifecycleTypeRecord> {
  return typesClient.update(typeId, input)
}

export function archiveScreenTimeLifecycleTypeClient(typeId: string): Promise<void> {
  return typesClient.remove(typeId)
}

export function fetchScreenTimeLifecycleAllowancesClient(
  query: ScreenTimeLifecycleAllowanceListQuery = {},
): Promise<ScreenTimeLifecycleAllowanceListResult> {
  return allowancesClient.action<ScreenTimeLifecycleAllowanceListResult>(
    '',
    'GET',
    undefined,
    undefined,
    { memberId: query.memberId ?? null, screenTimeTypeId: query.screenTimeTypeId ?? null },
  )
}

export function fetchScreenTimeLifecycleAllowancesForMemberClient(
  memberId: string,
): Promise<ScreenTimeLifecycleMemberAllowanceResult> {
  return allowancesClient.action<ScreenTimeLifecycleMemberAllowanceResult>(`/${memberId}`, 'GET')
}

export function saveScreenTimeLifecycleAllowanceClient(
  input: SaveScreenTimeLifecycleAllowanceInput,
): Promise<ScreenTimeLifecycleAllowanceRecord> {
  return allowancesClient.action<ScreenTimeLifecycleAllowanceRecord>('', 'POST', input, 'allowance')
}

export function adjustScreenTimeLifecycleBalanceClient(
  input: AdjustScreenTimeLifecycleBalanceInput,
): Promise<{ success: true; message: string } & ScreenTimeLifecycleAdjustmentResult> {
  return screenTimeClient.action<{ success: true; message: string } & ScreenTimeLifecycleAdjustmentResult>(
    '/adjust',
    'POST',
    input,
  )
}

export function fetchScreenTimeLifecycleGraceSettingsClient(
  memberId?: string,
): Promise<ScreenTimeLifecycleGraceSettings> {
  return graceSettingsClient.action('', 'GET', undefined, 'settings', { memberId })
}

export function updateScreenTimeLifecycleGraceSettingsClient(
  input: UpdateScreenTimeLifecycleGraceSettingsInput,
): Promise<ScreenTimeLifecycleGraceSettings> {
  return graceSettingsClient.action('', 'PUT', input, 'settings')
}

export function fetchScreenTimeLifecycleGraceStatusClient(
  memberId?: string,
): Promise<ScreenTimeLifecycleGraceStatus> {
  return graceStatusClient.action('', 'GET', undefined, 'status', { memberId })
}

export function requestScreenTimeLifecycleGraceClient(
  input: RequestScreenTimeLifecycleGraceInput,
): Promise<{ success: true; message: string } & ScreenTimeLifecycleGraceRequestResult> {
  return graceRequestClient.action<{ success: true; message: string } & ScreenTimeLifecycleGraceRequestResult>(
    '',
    'POST',
    input,
  )
}
