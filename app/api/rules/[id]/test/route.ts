/**
 * API Route: /api/rules/[id]/test
 *
 * POST - Dry-run test a rule with simulated context (no side effects)
 *
 * Parent-only access
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { dryRunRule } from '@/lib/rules-engine';
import { logger } from '@/lib/logger';

// ============================================
// POST /api/rules/[id]/test
// Dry-run test a rule with simulated context
// ============================================

export async function POST(
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

    const { context } = body;

    // Validate context is provided
    if (!context || typeof context !== 'object') {
      return NextResponse.json(
        { error: 'Simulated context is required and must be an object' },
        { status: 400 }
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

    // Add familyId to simulated context
    const simulatedContext = {
      ...context,
      familyId: session.user.familyId,
    };

    // Perform dry-run test
    const result = await dryRunRule(params.id, simulatedContext);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'RULE_TEST_RUN',
        entityType: 'AutomationRule',
        entityId: params.id,
        result: 'SUCCESS',
        metadata: {
          ruleName: rule.name,
          wouldExecute: result.wouldExecute,
          simulatedContext,
        },
      },
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error('Error testing rule:', error);
    return NextResponse.json(
      { error: 'Failed to test rule' },
      { status: 500 }
    );
  }
}
