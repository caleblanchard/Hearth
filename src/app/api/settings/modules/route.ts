import { NextRequest } from 'next/server'
import {
  listParentConfigurationModules,
  updateParentConfigurationModule,
} from '@/lib/data/parent-configuration-lifecycle'
import { readJsonBody, routeHandler } from '@/lib/api-route'
import type { ParentConfigurationModuleUpdateInput } from '@/types/parent-configuration-lifecycle'

export const GET = routeHandler(async () => {
  const { modules, categories } = await listParentConfigurationModules()
  return { modules, categories }
}, { errorMessage: 'Failed to get module configurations' })

export const PATCH = routeHandler(async (request: NextRequest) => {
  const body = await readJsonBody<ParentConfigurationModuleUpdateInput>(request)
  const module = await updateParentConfigurationModule({
    moduleId: body.moduleId,
    isEnabled: body.isEnabled,
  })

  return {
    success: true,
    module,
    message: 'Module configuration updated successfully',
  }
}, { errorMessage: 'Failed to update module configuration' })