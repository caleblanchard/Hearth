/**
 * API Route: /api/rules
 *
 * GET - List all automation rules for the family
 * POST - Create a new automation rule
 *
 * Parent-only access
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { validateRuleConfiguration } from '@/lib/rules-engine/validation';

// ============================================
// GET /api/rules
// List all automation rules for the family
// ============================================

export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const enabledParam = searchParams.get('enabled');
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get('limit') || '50', 10)),
      100 // Maximum limit
    );
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    // Build where clause
    const where: any = {
      familyId: session.user.familyId,
    };

    // Filter by enabled status if specified
    if (enabledParam !== null) {
      where.isEnabled = enabledParam === 'true';
    }

    // Fetch rules and count in parallel
    const [rules, total] = await Promise.all([
      prisma.automationRule.findMany({
        where,
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
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.automationRule.count({ where }),
    ]);

    return NextResponse.json({
      rules,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rules' },
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

    const { name, description, trigger, conditions, actions } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Rule name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!trigger || typeof trigger !== 'object') {
      return NextResponse.json(
        { error: 'Trigger configuration is required and must be an object' },
        { status: 400 }
      );
    }

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

    // Validate rule configuration using rules engine validator
    const validation = validateRuleConfiguration(trigger, conditions || null, actions);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Create the rule
    const rule = await prisma.automationRule.create({
      data: {
        familyId: session.user.familyId,
        name: name.trim(),
        description: description?.trim() || null,
        trigger,
        conditions: conditions || null,
        actions,
        isEnabled: true,
        createdById: session.user.id,
      },
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
        action: 'RULE_CREATED',
        entityType: 'AutomationRule',
        entityId: rule.id,
        result: 'SUCCESS',
        metadata: {
          ruleName: rule.name,
          triggerType: (rule.trigger as any)?.type || 'unknown',
          actionCount: (rule.actions as any[]).length,
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        rule,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating rule:', error);
    return NextResponse.json(
      { error: 'Failed to create rule' },
      { status: 500 }
    );
  }
}
