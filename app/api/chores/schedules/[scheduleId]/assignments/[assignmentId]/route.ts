import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function DELETE(
  request: Request,
  { params }: { params: { scheduleId: string; assignmentId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.familyId || session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    // Verify assignment exists
    const existingAssignment = await prisma.choreAssignment.findUnique({
      where: { id: params.assignmentId },
      include: {
        choreSchedule: {
          include: {
            choreDefinition: true,
            assignments: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!existingAssignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Verify family ownership
    if (existingAssignment.choreSchedule.choreDefinition.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Prevent deleting last assignment
    if (existingAssignment.choreSchedule.assignments.length <= 1) {
      return NextResponse.json({ error: 'Cannot remove the last assignment from a schedule' }, { status: 400 });
    }

    // Soft delete assignment
    await prisma.choreAssignment.update({
      where: { id: params.assignmentId },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Assignment removed successfully',
    });
  } catch (error) {
    logger.error('Error deleting assignment:', error);
    return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
  }
}
