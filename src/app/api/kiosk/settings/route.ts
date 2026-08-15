import { NextRequest } from 'next/server'
import {
  getParentKioskConfiguration,
  updateParentKioskConfiguration,
} from '@/lib/data/parent-configuration-lifecycle'
import { readJsonBody, routeHandler } from '@/lib/api-route'
import type { ParentKioskConfigurationUpdate } from '@/types/parent-configuration-lifecycle'

/**
 * GET /api/kiosk/settings
 *
 * Get kiosk settings for family
 * Only parents can access settings
 */
export const GET = routeHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  return getParentKioskConfiguration({
    familyId: searchParams.get('familyId') ?? undefined,
  })
}, { errorMessage: 'Failed to get kiosk settings' })

/**
 * PUT /api/kiosk/settings
 *
 * Update kiosk settings
 * Only parents can update settings
 */
export const PUT = routeHandler(async (request: NextRequest) => {
  const body = await readJsonBody<ParentKioskConfigurationUpdate>(request)
  const settings = await updateParentKioskConfiguration(body)

  return { settings }
}, { errorMessage: 'Failed to update kiosk settings' })