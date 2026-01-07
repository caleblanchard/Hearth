import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { user } = session;
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('memberId');
  const includeEnded = searchParams.get('includeEnded') === 'true';

  try {
    // Verify member if filtering
    if (memberId) {
      const member = await prisma.familyMember.findUnique({
        where: { id: memberId },
      });

      if (!member || member.familyId !== user.familyId) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }
    }

    // Build where clause
    const where: any = {
      familyId: user.familyId,
    };

    if (memberId) {
      where.memberId = memberId;
    }

    if (!includeEnded) {
      where.isActive = true;
    }

    // Get sick mode instances
    const instances = await prisma.sickModeInstance.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    return NextResponse.json({ instances }, { status: 200 });
  } catch (error) {
    console.error('Error fetching sick mode status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
