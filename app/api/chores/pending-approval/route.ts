import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can access this
    if (session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { familyId } = session.user;

    // Fetch chores pending approval
    const pendingChores = await prisma.choreInstance.findMany({
      where: {
        status: 'COMPLETED',
        choreSchedule: {
          choreDefinition: {
            familyId,
          },
        },
      },
      include: {
        choreSchedule: {
          include: {
            choreDefinition: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        completedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
    });

    return NextResponse.json({
      chores: pendingChores.map((chore) => ({
        id: chore.id,
        name: chore.choreSchedule.choreDefinition.name,
        description: chore.choreSchedule.choreDefinition.description,
        creditValue: chore.choreSchedule.choreDefinition.creditValue,
        difficulty: chore.choreSchedule.choreDefinition.difficulty,
        assignedTo: chore.assignedTo,
        completedBy: chore.completedBy,
        completedAt: chore.completedAt,
        notes: chore.notes,
        photoUrl: chore.photoUrl,
      })),
    });
  } catch (error) {
    console.error('Pending approval API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending approvals' },
      { status: 500 }
    );
  }
}
