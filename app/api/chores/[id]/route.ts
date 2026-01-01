import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.familyId || session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    const chore = await prisma.choreDefinition.findUnique({
      where: {
        id: params.id,
      },
      include: {
        schedules: {
          include: {
            assignments: {
              include: {
                member: {
                  select: {
                    id: true,
                    name: true,
                    avatarUrl: true,
                  },
                },
              },
              where: {
                isActive: true,
              },
              orderBy: {
                rotationOrder: 'asc',
              },
            },
            _count: {
              select: {
                instances: true,
              },
            },
          },
          where: {
            isActive: true,
          },
        },
      },
    });

    if (!chore) {
      return NextResponse.json({ error: 'Chore not found' }, { status: 404 });
    }

    // Verify family ownership
    if (chore.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ chore });
  } catch (error) {
    console.error('Error fetching chore:', error);
    return NextResponse.json({ error: 'Failed to fetch chore' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.familyId || session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    // Verify chore exists and belongs to family
    const existingChore = await prisma.choreDefinition.findUnique({
      where: { id: params.id },
    });

    if (!existingChore) {
      return NextResponse.json({ error: 'Chore not found' }, { status: 404 });
    }

    if (existingChore.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      creditValue,
      difficulty,
      estimatedMinutes,
      minimumAge,
      iconName,
    } = body;

    // Validation
    const updates: any = {};

    if (name !== undefined) {
      if (!name.trim() || name.length > 100) {
        return NextResponse.json({ error: 'Name must be 1-100 characters' }, { status: 400 });
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      updates.description = description?.trim() || null;
    }

    if (creditValue !== undefined) {
      if (creditValue < 0) {
        return NextResponse.json({ error: 'Credit value must be 0 or greater' }, { status: 400 });
      }
      updates.creditValue = creditValue;
    }

    if (difficulty !== undefined) {
      if (!['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
        return NextResponse.json({ error: 'Difficulty must be EASY, MEDIUM, or HARD' }, { status: 400 });
      }
      updates.difficulty = difficulty;
    }

    if (estimatedMinutes !== undefined) {
      if (estimatedMinutes <= 0) {
        return NextResponse.json({ error: 'Estimated minutes must be greater than 0' }, { status: 400 });
      }
      updates.estimatedMinutes = estimatedMinutes;
    }

    if (minimumAge !== undefined) {
      updates.minimumAge = minimumAge || null;
    }

    if (iconName !== undefined) {
      updates.iconName = iconName || null;
    }

    // Update chore
    const updatedChore = await prisma.choreDefinition.update({
      where: { id: params.id },
      data: updates,
      include: {
        schedules: {
          include: {
            assignments: {
              include: {
                member: {
                  select: {
                    id: true,
                    name: true,
                    avatarUrl: true,
                  },
                },
              },
              where: {
                isActive: true,
              },
            },
          },
          where: {
            isActive: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      chore: updatedChore,
      message: 'Chore updated successfully',
    });
  } catch (error) {
    console.error('Error updating chore:', error);
    return NextResponse.json({ error: 'Failed to update chore' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.familyId || session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    // Verify chore exists and belongs to family
    const existingChore = await prisma.choreDefinition.findUnique({
      where: { id: params.id },
      include: {
        schedules: true,
      },
    });

    if (!existingChore) {
      return NextResponse.json({ error: 'Chore not found' }, { status: 404 });
    }

    if (existingChore.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Soft delete: set isActive to false for chore and all schedules
    await prisma.$transaction([
      prisma.choreDefinition.update({
        where: { id: params.id },
        data: { isActive: false },
      }),
      prisma.choreSchedule.updateMany({
        where: { choreDefinitionId: params.id },
        data: { isActive: false },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Chore deactivated successfully',
    });
  } catch (error) {
    console.error('Error deleting chore:', error);
    return NextResponse.json({ error: 'Failed to delete chore' }, { status: 500 });
  }
}
