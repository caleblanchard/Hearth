import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

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

    // Get the routine
    const routine = await prisma.routine.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!routine) {
      return NextResponse.json({ error: 'Routine not found' }, { status: 404 });
    }

    // Verify routine belongs to user's family
    if (routine.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'You do not have permission to complete this routine' },
        { status: 403 }
      );
    }

    // Determine who is completing the routine
    let memberId = session.user.id;
    
    // Validate JSON input
    let body;
    try {
      body = await request.json();
    } catch (error) {
      // Empty body is acceptable for routine completion
      body = {};
    }

    // If parent is completing on behalf of child
    if (session.user.role === 'PARENT' && body.memberId) {
      // Verify member exists and belongs to family
      const member = await prisma.familyMember.findFirst({
        where: {
          id: body.memberId,
          familyId: session.user.familyId,
        },
      });

      if (!member) {
        return NextResponse.json(
          { error: 'Specified member is not a valid family member' },
          { status: 400 }
        );
      }

      memberId = body.memberId;
    } else if (session.user.role === 'CHILD') {
      // If routine is assigned to a specific child, verify it's this child
      if (routine.assignedTo && routine.assignedTo !== session.user.id) {
        return NextResponse.json(
          { error: 'This routine is not assigned to you' },
          { status: 403 }
        );
      }
    }

    // Create completion record with today's date (normalized to midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const completion = await prisma.routineCompletion.create({
        data: {
          routineId: params.id,
          memberId,
          date: today,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          familyId: session.user.familyId,
          memberId: session.user.id,
          action: 'ROUTINE_COMPLETED',
          result: 'SUCCESS',
          metadata: {
            routineId: routine.id,
            routineName: routine.name,
            completedBy: memberId,
            completedByUser: session.user.id,
          },
        },
      });

      return NextResponse.json(
        {
          completion,
          message: 'Routine completed successfully',
        },
        { status: 201 }
      );
    } catch (error: any) {
      // Handle unique constraint violation (already completed today)
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Routine already completed today' },
          { status: 400 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error completing routine:', error);
    return NextResponse.json(
      { error: 'Failed to complete routine' },
      { status: 500 }
    );
  }
}
