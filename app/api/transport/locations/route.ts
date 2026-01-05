import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const locations = await prisma.transportLocation.findMany({
      where: { familyId: session.user.familyId },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ locations });
  } catch (error) {
    logger.error('Error fetching transport locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transport locations' },
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

    // Only parents can create locations
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can create transport locations' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, address } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Create location
    const location = await prisma.transportLocation.create({
      data: {
        familyId: session.user.familyId,
        name: name.trim(),
        address: address?.trim() || null,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'TRANSPORT_LOCATION_ADDED',
        result: 'SUCCESS',
        metadata: {
          locationId: location.id,
          name: location.name,
        },
      },
    });

    return NextResponse.json(
      { location, message: 'Transport location created successfully' },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating transport location:', error);
    return NextResponse.json(
      { error: 'Failed to create transport location' },
      { status: 500 }
    );
  }
}
