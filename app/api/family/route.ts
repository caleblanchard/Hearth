import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const family = await prisma.family.findUnique({
      where: { id: session.user.familyId },
      include: {
        members: {
          orderBy: [
            { role: 'asc' }, // Parents first
            { name: 'asc' },
          ],
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
        },
      },
    });

    if (!family) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 });
    }

    return NextResponse.json({ family });
  } catch (error) {
    console.error('Error fetching family:', error);
    return NextResponse.json({ error: 'Failed to fetch family' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.familyId || session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, timezone, settings } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (settings !== undefined) updateData.settings = settings;

    const updatedFamily = await prisma.family.update({
      where: { id: session.user.familyId },
      data: updateData,
    });

    return NextResponse.json({
      message: 'Family settings updated successfully',
      family: updatedFamily,
    });
  } catch (error) {
    console.error('Error updating family:', error);
    return NextResponse.json({ error: 'Failed to update family' }, { status: 500 });
  }
}
