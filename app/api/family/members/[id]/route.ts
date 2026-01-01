import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcrypt';

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
    const { name, email, birthDate, avatarUrl, password, pin, isActive } = body;

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
      updateData.passwordHash = await hash(password, 12);
    }
    if (pin && member.role === 'CHILD') {
      updateData.pin = await hash(pin, 12);
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

    return NextResponse.json({
      message: 'Family member updated successfully',
      member: updatedMember,
    });
  } catch (error) {
    console.error('Error updating family member:', error);
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
    console.error('Error deleting family member:', error);
    return NextResponse.json({ error: 'Failed to delete family member' }, { status: 500 });
  }
}
