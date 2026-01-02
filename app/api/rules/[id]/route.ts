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
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { validateRuleConfiguration } from '@/lib/rules-engine/validation';

// ============================================
// GET /api/rules/[id]
// Get single rule with execution history
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a parent
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Forbidden - Parent access required' },
        { status: 403 }
      );
    }

    // Fetch the rule
    const rule = await prisma.automationRule.findUnique({
      where: { id: params.id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            executions: true,
          },
        },
      },
    });

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Check family ownership
    if (rule.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'Forbidden - Rule belongs to different family' },
        { status: 403 }
      );
    }

    // Parse query parameters for execution history
    const { searchParams } = new URL(request.url);
    const successParam = searchParams.get('success');
    const includeStats = searchParams.get('includeStats') === 'true';
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get('limit') || '20', 10)),
      100
    );
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    // Build where clause for executions
    const executionsWhere: any = { ruleId: params.id };
    if (successParam !== null) {
      executionsWhere.success = successParam === 'true';
    }

    // Fetch executions and count in parallel
    const [executions, totalExecutions] = await Promise.all([
      prisma.ruleExecution.findMany({
        where: executionsWhere,
        orderBy: { executedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.ruleExecution.count({ where: executionsWhere }),
    ]);

    // Build response
    const response: any = {
      rule,
      executions,
      totalExecutions,
      limit,
      offset,
    };

    // Include statistics if requested
    if (includeStats) {
      const [
        totalCount,
        successfulCount,
        failedCount,
        lastExecution,
      ] = await Promise.all([
        prisma.ruleExecution.count({ where: { ruleId: params.id } }),
        prisma.ruleExecution.count({ where: { ruleId: params.id, success: true } }),
        prisma.ruleExecution.count({ where: { ruleId: params.id, success: false } }),
        prisma.ruleExecution.findFirst({
          where: { ruleId: params.id },
          orderBy: { executedAt: 'desc' },
        }),
      ]);

      const successRate =
        totalCount > 0 ? Math.round((successfulCount / totalCount) * 100) : 0;

      response.stats = {
        totalExecutions: totalCount,
        successfulExecutions: successfulCount,
        failedExecutions: failedCount,
        successRate,
        lastExecutionAt: lastExecution?.executedAt || null,
        lastExecutionSuccess: lastExecution?.success || null,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching rule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rule' },
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
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a parent
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Forbidden - Parent access required' },
        { status: 403 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Fetch existing rule
    const existingRule = await prisma.automationRule.findUnique({
      where: { id: params.id },
    });

    if (!existingRule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Check family ownership
    if (existingRule.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'Forbidden - Rule belongs to different family' },
        { status: 403 }
      );
    }

    const { name, description, trigger, conditions, actions } = body;

    // Build update data object (only include fields that are being updated)
    const updateData: any = {};

    // Validate and process name
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Rule name must be a non-empty string' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    // Validate and process description
    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    // Validate and process trigger
    if (trigger !== undefined) {
      if (!trigger || typeof trigger !== 'object') {
        return NextResponse.json(
          { error: 'Trigger configuration must be an object' },
          { status: 400 }
        );
      }
      updateData.trigger = trigger;
    }

    // Validate and process conditions
    if (conditions !== undefined) {
      updateData.conditions = conditions || null;
    }

    // Validate and process actions
    if (actions !== undefined) {
      if (!Array.isArray(actions)) {
        return NextResponse.json(
          { error: 'Actions must be an array' },
          { status: 400 }
        );
      }

      if (actions.length === 0) {
        return NextResponse.json(
          { error: 'At least one action is required' },
          { status: 400 }
        );
      }

      updateData.actions = actions;
    }

    // If trigger, conditions, or actions are being updated, validate the full configuration
    if (trigger !== undefined || conditions !== undefined || actions !== undefined) {
      const finalTrigger = trigger || existingRule.trigger;
      const finalConditions = conditions !== undefined ? conditions : existingRule.conditions;
      const finalActions = actions || existingRule.actions;

      const validation = validateRuleConfiguration(
        finalTrigger as any,
        finalConditions as any,
        finalActions as any
      );

      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
    }

    // Update the rule
    const updatedRule = await prisma.automationRule.update({
      where: { id: params.id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'RULE_UPDATED',
        entityType: 'AutomationRule',
        entityId: params.id,
        result: 'SUCCESS',
        metadata: {
          ruleName: updatedRule.name,
          updatedFields: Object.keys(updateData),
        },
      },
    });

    return NextResponse.json({
      success: true,
      rule: updatedRule,
    });
  } catch (error) {
    console.error('Error updating rule:', error);
    return NextResponse.json(
      { error: 'Failed to update rule' },
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
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a parent
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Forbidden - Parent access required' },
        { status: 403 }
      );
    }

    // Fetch the rule to verify ownership
    const rule = await prisma.automationRule.findUnique({
      where: { id: params.id },
    });

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Check family ownership
    if (rule.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'Forbidden - Rule belongs to different family' },
        { status: 403 }
      );
    }

    // Delete the rule (cascade will delete executions)
    await prisma.automationRule.delete({
      where: { id: params.id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'RULE_DELETED',
        entityType: 'AutomationRule',
        entityId: params.id,
        result: 'SUCCESS',
        metadata: {
          ruleName: rule.name,
          triggerType: (rule.trigger as any).type,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Rule deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete rule' },
      { status: 500 }
    );
  }
}
