import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId } = session.user;

    // Fetch active rewards for the family
    const rewards = await prisma.rewardItem.findMany({
      where: {
        familyId,
        status: 'ACTIVE',
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            redemptions: {
              where: {
                status: {
                  in: ['PENDING', 'APPROVED'],
                },
              },
            },
          },
        },
      },
      orderBy: [
        { costCredits: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({ rewards });
  } catch (error) {
    console.error('Rewards API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rewards' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can create rewards
    if (session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, description, category, costCredits, quantity, imageUrl } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!costCredits || costCredits < 0) {
      return NextResponse.json(
        { error: 'Valid cost in credits is required' },
        { status: 400 }
      );
    }

    const { familyId } = session.user;

    // Create reward
    const reward = await prisma.rewardItem.create({
      data: {
        familyId,
        name: name.trim(),
        description: description || null,
        category: category || 'OTHER',
        costCredits,
        quantity: quantity || null,
        imageUrl: imageUrl || null,
        status: 'ACTIVE',
        createdById: session.user.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      reward,
      message: 'Reward created successfully',
    });
  } catch (error) {
    console.error('Create reward error:', error);
    return NextResponse.json(
      { error: 'Failed to create reward' },
      { status: 500 }
    );
  }
}
