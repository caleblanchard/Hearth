/**
 * API Route: /api/rules/executions
 *
 * GET - Get execution history across all rules
 *
 * Parent-only access
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

// ============================================
// GET /api/rules/executions
// Get execution history for all family rules
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
    const ruleId = searchParams.get('ruleId');
    const successParam = searchParams.get('success');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get('limit') || '50', 10)),
      100 // Maximum limit
    );
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    // Build where clause
    const where: any = {
      rule: {
        familyId: session.user.familyId,
      },
    };

    // Filter by specific rule
    if (ruleId) {
      where.ruleId = ruleId;
    }

    // Filter by success status
    if (successParam !== null) {
      where.success = successParam === 'true';
    }

    // Filter by date range
    if (startDate || endDate) {
      where.executedAt = {};
      if (startDate) {
        where.executedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.executedAt.lte = new Date(endDate);
      }
    }

    // Fetch executions and count in parallel
    const [executions, total] = await Promise.all([
      prisma.ruleExecution.findMany({
        where,
        include: {
          rule: {
            select: {
              id: true,
              name: true,
              familyId: true,
              isEnabled: true,
            },
          },
        },
        orderBy: {
          executedAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.ruleExecution.count({ where }),
    ]);

    return NextResponse.json({
      executions,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Error fetching executions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch executions' },
      { status: 500 }
    );
  }
}
