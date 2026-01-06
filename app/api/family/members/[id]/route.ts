import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hash } from 'bcrypt';
import { BCRYPT_ROUNDS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import { ModuleId } from '@/app/generated/prisma';

// All modules that should be enabled by default (if no config exists)
const DEFAULT_ENABLED_MODULES: ModuleId[] = [
  'CHORES',
  'SCREEN_TIME',
  'CREDITS',
  'SHOPPING',
  'CALENDAR',
  'TODOS',
  'ROUTINES',
  'MEAL_PLANNING',
  'RECIPES',
  'INVENTORY',
  'HEALTH',
  'PROJECTS',
  'COMMUNICATION',
  'TRANSPORT',
  'PETS',
  'MAINTENANCE',
  'DOCUMENTS',
  'FINANCIAL',
  'LEADERBOARD',
];

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.familyId || session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { name, email, birthDate, avatarUrl, password, pin, isActive, allowedModules } = body;

    // Verify the member belongs to the same family
    const member = await prisma.familyMember.findUnique({
      where: { id },
    });

    if (!member || member.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 });
    }

    // Prevent deactivating yourself
    if (isActive === false && member.id === session.user.id) {
      return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
    }

    // Check if trying to change email to one that's already in use
    if (email && email !== member.email) {
      const existingMember = await prisma.familyMember.findUnique({
        where: { email },
      });

      if (existingMember && existingMember.id !== id) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email || null;
    if (birthDate !== undefined) {
      updateData.birthDate = birthDate ? new Date(birthDate) : undefined;
    }
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Hash new password or PIN if provided
    if (password && member.role === 'PARENT') {
      updateData.passwordHash = await hash(password, BCRYPT_ROUNDS);
    }
    if (pin && member.role === 'CHILD') {
      updateData.pin = await hash(pin, BCRYPT_ROUNDS);
    }

    const updatedMember = await prisma.familyMember.update({
      where: { id },
      data: updateData,
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

    // Update module access for children if provided
    if (member.role === 'CHILD' && allowedModules !== undefined && Array.isArray(allowedModules)) {
      // Get all configured modules (both enabled and disabled)
      const allConfigs = await prisma.moduleConfiguration.findMany({
        where: { familyId: session.user.familyId },
        select: { moduleId: true, isEnabled: true },
      });

      // Build enabled modules list (similar to /api/settings/modules/enabled)
      const configuredModuleIds = new Set(allConfigs.map((c) => c.moduleId));
      const enabledConfiguredIds = allConfigs
        .filter((c) => c.isEnabled)
        .map((c) => c.moduleId);

      // Add default-enabled modules that haven't been configured yet
      const familyEnabledModules = [
        ...enabledConfiguredIds,
        ...DEFAULT_ENABLED_MODULES.filter((m) => !configuredModuleIds.has(m)),
      ];

      const enabledModuleIds = new Set(familyEnabledModules);

      // Delete all existing module access for this member
      await prisma.memberModuleAccess.deleteMany({
        where: { memberId: id },
      });

      // Create new module access entries for each allowed module
      // Only allow modules that are enabled at the family level
      const moduleAccessData = allowedModules
        .filter((moduleId: string) => enabledModuleIds.has(moduleId as ModuleId))
        .map((moduleId: string) => ({
          memberId: id,
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
      message: 'Family member updated successfully',
      member: updatedMember,
    });
  } catch (error) {
    logger.error('Error updating family member:', error);
    return NextResponse.json({ error: 'Failed to update family member' }, { status: 500 });
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

    const { id } = params;

    // Verify the member belongs to the same family
    const member = await prisma.familyMember.findUnique({
      where: { id },
    });

    if (!member || member.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 });
    }

    // Prevent deleting yourself
    if (member.id === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Check if this is the last parent
    if (member.role === 'PARENT') {
      const parentCount = await prisma.familyMember.count({
        where: {
          familyId: session.user.familyId,
          role: 'PARENT',
          isActive: true,
        },
      });

      if (parentCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last parent account' },
          { status: 400 }
        );
      }
    }

    // Soft delete - deactivate instead of removing
    await prisma.familyMember.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      message: 'Family member deactivated successfully',
    });
  } catch (error) {
    logger.error('Error deleting family member:', error);
    return NextResponse.json({ error: 'Failed to delete family member' }, { status: 500 });
  }
}
