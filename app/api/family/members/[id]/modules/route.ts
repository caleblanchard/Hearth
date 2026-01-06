import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Verify the member belongs to the same family
    const member = await prisma.familyMember.findUnique({
      where: { id },
      select: { familyId: true, role: true },
    });

    if (!member || member.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 });
    }

    // Parents can see all family-enabled modules, children see only their allowed modules
    if (member.role === 'PARENT') {
      // Get all family-level enabled modules
      const familyModules = await prisma.moduleConfiguration.findMany({
        where: {
          familyId: session.user.familyId,
          isEnabled: true,
        },
        select: {
          moduleId: true,
        },
      });

      return NextResponse.json({
        allowedModules: familyModules.map(m => m.moduleId),
      });
    } else {
      // For children, get their specific module access
      const memberAccess = await prisma.memberModuleAccess.findMany({
        where: {
          memberId: id,
          hasAccess: true,
        },
        select: {
          moduleId: true,
        },
      });

      // Also verify these modules are still enabled at family level
      const familyModules = await prisma.moduleConfiguration.findMany({
        where: {
          familyId: session.user.familyId,
          isEnabled: true,
        },
        select: {
          moduleId: true,
        },
      });

      const enabledModuleIds = new Set(familyModules.map(m => m.moduleId));
      const allowedModules = memberAccess
        .map(a => a.moduleId)
        .filter(moduleId => enabledModuleIds.has(moduleId));

      return NextResponse.json({
        allowedModules,
      });
    }
  } catch (error) {
    logger.error('Error fetching member modules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch member modules' },
      { status: 500 }
    );
  }
}
