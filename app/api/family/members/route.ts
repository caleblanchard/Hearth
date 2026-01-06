import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hash } from 'bcrypt';
import { BCRYPT_ROUNDS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import { ModuleId } from '@/app/generated/prisma';

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.familyId || session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, role, birthDate, password, pin, avatarUrl, allowedModules } = body;

    // Validation
    if (!name || !role) {
      return NextResponse.json({ error: 'Name and role are required' }, { status: 400 });
    }

    if (role === 'PARENT') {
      if (!email) {
        return NextResponse.json({ error: 'Email is required for parent accounts' }, { status: 400 });
      }
      if (!password) {
        return NextResponse.json({ error: 'Password is required for parent accounts' }, { status: 400 });
      }
    }

    if (role === 'CHILD' && !pin) {
      return NextResponse.json({ error: 'PIN is required for child accounts' }, { status: 400 });
    }

    // Check if email already exists (for parent accounts)
    if (email) {
      const existingMember = await prisma.familyMember.findUnique({
        where: { email },
      });

      if (existingMember) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
    }

    // Hash password or PIN
    let passwordHash = null;
    let pinHash = null;

    if (role === 'PARENT' && password) {
      passwordHash = await hash(password, BCRYPT_ROUNDS);
    } else if (role === 'CHILD' && pin) {
      pinHash = await hash(pin, BCRYPT_ROUNDS);
    }

    // Create the family member
    const newMember = await prisma.familyMember.create({
      data: {
        familyId: session.user.familyId,
        name,
        email: email || null,
        passwordHash,
        pin: pinHash,
        role,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        avatarUrl: avatarUrl || null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        birthDate: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Initialize balances for children
    if (role === 'CHILD') {
      // Create credit balance
      await prisma.creditBalance.create({
        data: {
          memberId: newMember.id,
          currentBalance: 0,
          lifetimeEarned: 0,
          lifetimeSpent: 0,
        },
      });

      // Create screen time settings and balance
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      // Create screen time settings with 0 allocation
      // Screen time should only come from type-specific allowances configured in settings
      await prisma.screenTimeSettings.create({
        data: {
          memberId: newMember.id,
          weeklyAllocationMinutes: 0, // No general allocation - only type-specific allowances
          resetDay: 'SUNDAY',
          rolloverType: 'NONE',
          isActive: true,
        },
      });

      // Create balance with 0 initial balance
      // Balance will be managed through type-specific allowances
      await prisma.screenTimeBalance.create({
        data: {
          memberId: newMember.id,
          currentBalanceMinutes: 0,
          weekStartDate: weekStart,
        },
      });
    }

    // For children, set up module access if provided
    if (role === 'CHILD' && allowedModules && Array.isArray(allowedModules)) {
      // Get family-level enabled modules
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

      // Create module access entries for each allowed module
      // Only allow modules that are enabled at the family level
      const moduleAccessData = allowedModules
        .filter((moduleId: string) => enabledModuleIds.has(moduleId as ModuleId))
        .map((moduleId: string) => ({
          memberId: newMember.id,
          moduleId: moduleId as ModuleId,
          hasAccess: true,
        }));

      if (moduleAccessData.length > 0) {
        await prisma.memberModuleAccess.createMany({
          data: moduleAccessData,
        });
      }
    }

    return NextResponse.json({
      message: 'Family member added successfully',
      member: newMember,
    });
  } catch (error) {
    logger.error('Error creating family member:', error);
    return NextResponse.json({ error: 'Failed to create family member' }, { status: 500 });
  }
}
