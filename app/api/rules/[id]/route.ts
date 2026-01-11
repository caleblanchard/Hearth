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
  try {
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

    // Fetch the rule
    const rule = await getAutomationRule(id);

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Verify family ownership
    if (rule.family_id !== familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ rule });
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
  try {
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

    // Verify rule exists
    const existing = await getAutomationRule(id);
    if (!existing || existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    const body = await request.json();

    // If updating trigger/actions/conditions, validate
    if (body.trigger || body.actions || body.conditions) {
      const validation = validateRuleConfiguration({
        trigger: body.trigger || existing.trigger,
        actions: body.actions || existing.actions,
        conditions: body.conditions || existing.conditions,
      });

      if (!validation.valid) {
        return NextResponse.json(
          { error: 'Invalid rule configuration', details: validation.errors },
          { status: 400 }
        );
      }
    }

    const rule = await updateAutomationRule(id, body);

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
  try {
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

    // Verify rule exists
    const existing = await getAutomationRule(id);
    if (!existing || existing.family_id !== familyId) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    await deleteAutomationRule(id);

    return NextResponse.json({
      success: true,
      message: 'Automation rule deleted successfully',
    });
  } catch (error) {
    logger.error('[API] Error deleting automation rule', error);
    return NextResponse.json(
      { error: 'Failed to delete automation rule' },
      { status: 500 }
    );
  }
}
