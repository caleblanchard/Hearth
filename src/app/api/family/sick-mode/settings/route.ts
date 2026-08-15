import { NextRequest } from 'next/server'
import {
  getFamilySickModeConfiguration,
  updateFamilySickModeConfiguration,
} from '@/lib/data/parent-configuration-lifecycle'
import { readJsonBody, routeHandler } from '@/lib/api-route'

export const GET = routeHandler(async () => {
  const settings = await getFamilySickModeConfiguration()
  return { settings }
}, { errorMessage: 'Failed to get settings' })

export const PUT = routeHandler(async (request: NextRequest) => {
  const body = await readJsonBody<Record<string, unknown>>(request)
  const settings = await updateFamilySickModeConfiguration(body)

  return {
    success: true,
    settings,
    message: 'Sick mode settings updated successfully',
  }
}, { errorMessage: 'Failed to update settings' })