import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const routineId = searchParams.get('routineId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get('limit') || '50', 10)),
      100  // Maximum limit
    );
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    // Build query filters
    const where: any = {
      routine: {
        familyId: session.user.familyId,
      },
    };

    // For children, only show their own completions
    if (session.user.role === 'CHILD') {
      where.memberId = session.user.id;
    } else if (memberId) {
      // Parent can filter by specific member
      where.memberId = memberId;
    }

    // Filter by routine if specified
    if (routineId) {
      where.routineId = routineId;
    }

    // Filter by date range if specified
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include the entire end date
        where.date.lte = end;
      }
    }

    // Fetch completions with pagination
    const [completions, total] = await Promise.all([
      prisma.routineCompletion.findMany({
        where,
        include: {
          routine: {
            select: {
              id: true,
              name: true,
              type: true,
              familyId: true,
            },
          },
          member: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          completedAt: 'desc',
        },
        skip: offset,
        take: limit,
      }),
      prisma.routineCompletion.count({ where }),
    ]);

    return NextResponse.json({
      completions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching routine completions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch routine completions' },
      { status: 500 }
    );
  }
}
