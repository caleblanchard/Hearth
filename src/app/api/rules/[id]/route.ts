/**
 * API Route: /api/rules/[id]
 *
 * GET - Get single automation rule with execution history
 * PATCH - Update an automation rule
 * DELETE - Delete an automation rule
 *
 * Parent-only access
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getAutomationRule, updateAutomationRule, deleteAutomationRule } from '@/lib/data/automation';
import { validateRuleConfiguration } from '@/lib/rules-engine/validation';
import { logger } from '@/lib/logger';

// ============================================
// GET /api/rules/[id]
// Get single rule with execution history
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const successParam = searchParams.get('success');
    const success = successParam === null ? undefined : successParam === 'true';

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

    // Fetch the rule
    const rule = await getAutomationRule(id, limit, offset, success);

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Verify family ownership
    if (rule.family_id !== familyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { executions, totalExecutions, stats, ...ruleData } = rule as any;

    return NextResponse.json({
      rule: ruleData,
      executions,
      limit,
      offset,
      totalExecutions,
      stats
    });
  } catch (error) {
    logger.error('[API] Error fetching automation rule', error);
    return NextResponse.json(
      { error: 'Failed to fetch automation rule' },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH /api/rules/[id]
// Update an automation rule
// ============================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
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

    // Parse body first to handle invalid JSON immediately (400)
    let body;
    try {
      body = await request.json();
    } catch (e) {
      if (e instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
      }
      throw e;
    }

    // Verify rule exists
    const existing = await getAutomationRule(id);

    if (!existing) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    if (existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Explicit validation checks
    if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim().length === 0)) {
      return NextResponse.json({ error: 'Rule name is required' }, { status: 400 });
    }

    if (body.actions !== undefined) {
      if (!Array.isArray(body.actions)) {
        return NextResponse.json({ error: 'Actions must be an array' }, { status: 400 });
      }
      if (body.actions.length === 0) {
        return NextResponse.json({ error: 'At least one action is required' }, { status: 400 });
      }
    }

    // Trim string fields
    if (body.name) body.name = body.name.trim();
    if (body.description) body.description = body.description.trim();

    // If updating trigger/actions/conditions, validate
    if (body.trigger || body.actions || body.conditions) {
      try {
        const validation = validateRuleConfiguration(
          body.trigger || existing.trigger,
          body.conditions || existing.conditions || null,
          body.actions || existing.actions
        );

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
        logger.error('Validation error:', err);
        // If validation throws, return 400 with message if possible
        return NextResponse.json(
          { error: (err as Error).message || 'Invalid rule configuration' },
          { status: 400 }
        );
      }
    }

    const rule = await updateAutomationRule(id, body);

    const supabase = await createClient();
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'RULE_UPDATED',
      entity_type: 'AutomationRule',
      entity_id: id,
      result: 'SUCCESS',
      metadata: {
        name: rule.name,
        triggerType: (rule.trigger as any)?.type
      }
    });

    return NextResponse.json({
      success: true,
      rule,
      message: 'Automation rule updated successfully',
    });
  } catch (error) {
    logger.error('[API] Error updating automation rule', error);
    return NextResponse.json(
      { error: 'Failed to update automation rule' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/rules/[id]
// Delete an automation rule
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
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

    // Verify rule exists
    const existing = await getAutomationRule(id);

    if (!existing) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    if (existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteAutomationRule(id);

    const supabase = await createClient();
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'RULE_DELETED',
      entity_type: 'AutomationRule',
      entity_id: id,
      result: 'SUCCESS',
      metadata: {
        ruleName: existing.name,
        triggerType: (existing.trigger as any)?.type
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Automation rule deleted successfully',
    });
  } catch (error) {
    logger.error('[API] Error deleting automation rule', error);
    return NextResponse.json(
      { error: 'Failed to delete rule' },
      { status: 500 }
    );
  }
}
