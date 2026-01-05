import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function DELETE() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId } = session.user;

    // Delete all completed todos for the family
    const result = await prisma.todoItem.deleteMany({
      where: {
        familyId,
        status: 'COMPLETED',
      },
    });

    return NextResponse.json({
      success: true,
      message: `${result.count} completed task${result.count !== 1 ? 's' : ''} cleared`,
      count: result.count,
    });
  } catch (error) {
    logger.error('Clear completed todos error:', error);
    return NextResponse.json(
      { error: 'Failed to clear completed todos' },
      { status: 500 }
    );
  }
}
