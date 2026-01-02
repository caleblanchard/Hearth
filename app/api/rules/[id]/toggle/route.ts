/**
 * API Route: /api/rules/[id]/toggle
 *
 * PATCH - Toggle automation rule enabled/disabled state
 *
 * Parent-only access
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// ============================================
// PATCH /api/rules/[id]/toggle
// Toggle rule enabled/disabled state
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

    // Fetch the rule
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

    // Toggle the enabled state
    const newIsEnabled = !rule.isEnabled;

    // Update the rule
    const updatedRule = await prisma.automationRule.update({
      where: { id: params.id },
      data: { isEnabled: newIsEnabled },
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
        action: newIsEnabled ? 'RULE_ENABLED' : 'RULE_DISABLED',
        entityType: 'AutomationRule',
        entityId: params.id,
        result: 'SUCCESS',
        metadata: {
          ruleName: rule.name,
          previousState: rule.isEnabled,
          newState: newIsEnabled,
        },
      },
    });

    return NextResponse.json({
      success: true,
      rule: updatedRule,
    });
  } catch (error) {
    console.error('Error toggling rule:', error);
    return NextResponse.json(
      { error: 'Failed to toggle rule' },
      { status: 500 }
    );
  }
}
