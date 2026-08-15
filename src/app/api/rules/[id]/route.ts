/**
 * API Route: /api/rules/[id]
 *
 * GET - Get single automation rule with execution history
 * PATCH - Update an automation rule
 * DELETE - Delete an automation rule
 *
 * Parent-only access
 */

import { NextRequest } from 'next/server'
import { readJsonBody, routeHandler, type RouteContext } from '@/lib/api-route'
import {
  deleteAutomationLifecycleRule,
  getAutomationLifecycleRule,
  updateAutomationLifecycleRule,
} from '@/lib/data/automation-rule-lifecycle'
import type { UpdateAutomationRuleInput } from '@/types/automation-rule-lifecycle'
import { NextResponse } from 'next/server'

// ============================================
// GET /api/rules/[id]
// Get single rule with execution history
// ============================================

export const GET = routeHandler(
  async (request: NextRequest, { params }: RouteContext) => {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    return getAutomationLifecycleRule(id, {
      limit: Math.min(parseInt(searchParams.get('limit') || '10', 10), 100),
      offset: parseInt(searchParams.get('offset') || '0', 10),
      success:
        searchParams.get('success') === null
          ? undefined
          : searchParams.get('success') === 'true',
    })
  },
  { errorMessage: 'Failed to fetch automation rule' }
)

// ============================================
// PATCH /api/rules/[id]
// Update an automation rule
// ============================================

export const PATCH = routeHandler(
  async (request: NextRequest, { params }: RouteContext) => {
    const { id } = await params
    const body = await readJsonBody(request)
    const rule = await updateAutomationLifecycleRule(id, {
      name: body.name,
      description: body.description,
      isEnabled: body.isEnabled ?? body.is_enabled,
      trigger: body.trigger,
      conditions: Object.prototype.hasOwnProperty.call(body, 'conditions')
        ? body.conditions
        : undefined,
      actions: body.actions,
    } as UpdateAutomationRuleInput)

    return {
      success: true,
      rule,
      message: 'Automation rule updated successfully',
    }
  },
  { errorMessage: 'Failed to update automation rule' }
)

// ============================================
// DELETE /api/rules/[id]
// Delete an automation rule
// ============================================

export const DELETE = routeHandler(
  async (_request: NextRequest, { params }: RouteContext) => {
    const { id } = await params
    await deleteAutomationLifecycleRule(id)

    return {
      success: true,
      message: 'Automation rule deleted successfully',
    }
  },
  { errorMessage: 'Failed to delete rule' }
)