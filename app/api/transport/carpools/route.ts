import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const carpools = await prisma.carpoolGroup.findMany({
      where: { familyId: session.user.familyId },
      include: {
        members: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ carpools });
  } catch (error) {
    console.error('Error fetching carpool groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch carpool groups' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can create carpools
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can create carpool groups' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, members } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Validate members if provided
    const membersList = members || [];
    for (const member of membersList) {
      if (!member.name) {
        return NextResponse.json(
          { error: 'All carpool members must have a name' },
          { status: 400 }
        );
      }
    }

    // Create carpool with members
    const carpool = await prisma.carpoolGroup.create({
      data: {
        familyId: session.user.familyId,
        name: name.trim(),
        members: {
          create: membersList.map((member: any) => ({
            name: member.name.trim(),
            phone: member.phone?.trim() || null,
            email: member.email?.trim() || null,
          })),
        },
      },
      include: {
        members: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'CARPOOL_GROUP_CREATED',
        result: 'SUCCESS',
        metadata: {
          carpoolId: carpool.id,
          name: carpool.name,
          memberCount: membersList.length,
        },
      },
    });

    return NextResponse.json(
      { carpool, message: 'Carpool group created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating carpool group:', error);
    return NextResponse.json(
      { error: 'Failed to create carpool group' },
      { status: 500 }
    );
  }
}
