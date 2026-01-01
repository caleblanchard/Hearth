import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const memberId = searchParams.get('memberId'); // For parent viewing child's history

    // Determine which member's history to fetch
    let targetMemberId = session.user.id;
    if (memberId) {
      // If requesting another member's history, verify parent access
      if (session.user.role !== 'PARENT') {
        return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
      }

      // Verify member belongs to same family
      const targetMember = await prisma.familyMember.findUnique({
        where: { id: memberId },
        select: { familyId: true },
      });

      if (!targetMember || targetMember.familyId !== session.user.familyId) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      targetMemberId = memberId;
    }

    // Fetch transaction history
    const [transactions, total] = await Promise.all([
      prisma.screenTimeTransaction.findMany({
        where: { memberId: targetMemberId },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.screenTimeTransaction.count({
        where: { memberId: targetMemberId },
      }),
    ]);

    return NextResponse.json({
      transactions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Screen time history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch screen time history' },
      { status: 500 }
    );
  }
}
