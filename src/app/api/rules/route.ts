/**
 * API Route: /api/rules
 *
 * GET - List all automation rules for the family
 * POST - Create a new automation rule
 *
 * Parent-only access
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  createAutomationLifecycleRule,
  listAutomationLifecycleRules,
} from '@/lib/data/automation-rule-lifecycle'
import { readJsonBody, routeHandler } from '@/lib/api-route'
import type { CreateAutomationRuleInput } from '@/types/automation-rule-lifecycle'

type CreateRuleBody = CreateAutomationRuleInput & { is_enabled?: boolean }

// ============================================
// GET /api/rules
// List all automation rules for the family
// ============================================

export const GET = routeHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const enabledParam = searchParams.get('enabled')
  const limitParam = searchParams.get('limit')
  const offsetParam = searchParams.get('offset')

  return listAutomationLifecycleRules({
    enabled: enabledParam === null ? undefined : enabledParam === 'true',
    limit: Math.min(limitParam ? parseInt(limitParam, 10) : 100, 100),
    offset: offsetParam ? parseInt(offsetParam, 10) : undefined,
  })
}, { errorMessage: 'Failed to fetch automation rules' })

// ============================================
// POST /api/rules
// Create a new automation rule
// ============================================

export const POST = routeHandler(async (request: NextRequest) => {
  const body = await readJsonBody<CreateRuleBody>(request)
  const rule = await createAutomationLifecycleRule({
    name: body.name,
    description: body.description,
    isEnabled: body.isEnabled ?? body.is_enabled,
    trigger: body.trigger,
    conditions: body.conditions ?? null,
    actions: body.actions,
  })

  return NextResponse.json(
    {
      success: true,
      rule,
      message: 'Automation rule created successfully',
    },
    { status: 201 }
  )
}, { errorMessage: 'Failed to create automation rule' })