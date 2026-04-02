/**
 * API Route: /api/rules
 *
 * GET - List all automation rules for the family
 * POST - Create a new automation rule
 *
 * Parent-only access
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getAutomationRules, createAutomationRule } from '@/lib/data/automation';
import { validateRuleConfiguration } from '@/lib/rules-engine/validation';
import { logger } from '@/lib/logger';

// ============================================
// GET /api/rules
// List all automation rules for the family
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Check if user is a parent
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Forbidden - Parent access required' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const enabledParam = searchParams.get('enabled');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    const enabled = enabledParam === null ? undefined : enabledParam === 'true';
    const limit = Math.min(limitParam ? parseInt(limitParam) : 100, 100);
    const offset = offsetParam ? parseInt(offsetParam) : undefined;

    // Fetch rules
    const rules = await getAutomationRules(familyId, enabled, limit, offset);

    // Map to camelCase for frontend
    const mappedRules = rules.map(rule => ({
      id: rule.id,
      familyId: rule.family_id,
      name: rule.name,
      description: rule.description,
      trigger: rule.trigger,
      conditions: rule.conditions,
      actions: rule.actions,
      isEnabled: rule.is_enabled,
      createdById: rule.created_by_id,
      createdAt: rule.created_at,
      updatedAt: rule.updated_at,
      created_by_member: rule.created_by_member,
      _count: { executions: (rule.executions as any)?.[0]?.count || 0 },
    }));

    return NextResponse.json({
      rules: mappedRules,
      total: mappedRules.length,
    });
  } catch (error) {
    logger.error('[API] Error fetching automation rules', error);
    return NextResponse.json(
      { error: 'Failed to fetch automation rules' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/rules
// Create a new automation rule
// ============================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Check if user is a parent
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Forbidden - Parent access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, description, isEnabled, trigger, actions, conditions } = body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Rule name is required' },
        { status: 400 }
      );
    }

    if (!trigger) {
      return NextResponse.json(
        { error: 'Trigger configuration is required' },
        { status: 400 }
      );
    }

    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json(
        { error: 'Actions is missing or empty' },
        { status: 400 }
      );
    }

    // Validate rule configuration
    try {
      const validation = validateRuleConfiguration(trigger, conditions || null, actions);
      if (!validation.valid) {
        const errorMessage = validation.errors && validation.errors.length > 0 
          ? validation.errors[0] 
          : 'Invalid rule configuration';
          
        return NextResponse.json(
          { error: errorMessage, details: validation.errors || [] },
          { status: 400 }
        );
      }
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid rule configuration' },
        { status: 400 }
      );
    }

    // Create rule
    const rule = await createAutomationRule({
      family_id: familyId,
      name: name.trim(),
      description: description?.trim() || null,
      is_enabled: isEnabled ?? true,
      trigger: trigger as any,
      actions: actions as any,
      conditions: conditions || null,
      created_by_id: memberId,
    });

    // Audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'RULE_CREATED',
      entity_type: 'AutomationRule',
      entity_id: rule.id,
      result: 'SUCCESS',
      metadata: { name: name.trim(), triggerType: trigger.type },
    });

    return NextResponse.json(
      {
        success: true,
        rule,
        message: 'Automation rule created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    logger.error('[API] Error creating automation rule', error);
    return NextResponse.json(
      { error: 'Failed to create automation rule' },
      { status: 500 }
    );
  }
}
