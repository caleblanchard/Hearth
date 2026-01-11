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

    const familyId = authContext.defaultFamilyId;
    const memberId = authContext.defaultMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Check if user is a parent
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Forbidden - Parent access required' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const enabledParam = searchParams.get('enabled');

    // Build filters
    const filters: any = {};
    if (enabledParam !== null) {
      filters.enabled = enabledParam === 'true';
    }

    // Fetch rules
    const rules = await getAutomationRules(familyId, filters);

    return NextResponse.json({
      rules,
      total: rules.length,
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

    const familyId = authContext.defaultFamilyId;
    const memberId = authContext.defaultMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Check if user is a parent
    const isParent = await isParentInFamily(memberId, familyId);
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
        { error: 'At least one action is required' },
        { status: 400 }
      );
    }

    // Validate rule configuration
    const validation = validateRuleConfiguration({ trigger, actions, conditions });
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid rule configuration', details: validation.errors },
        { status: 400 }
      );
    }

    // Create rule
    const rule = await createAutomationRule(familyId, {
      name: name.trim(),
      description: description?.trim() || null,
      isEnabled: isEnabled ?? true,
      trigger,
      actions,
      conditions: conditions || [],
      createdById: memberId,
    });

    // Audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'RULE_CREATED',
      entity_type: 'AUTOMATION_RULE',
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
    logger.error('[API] Error creating automation rule', error);
    return NextResponse.json(
      { error: 'Failed to create automation rule' },
      { status: 500 }
    );
  }
}
