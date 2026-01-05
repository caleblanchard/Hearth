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

    const drivers = await prisma.transportDriver.findMany({
      where: { familyId: session.user.familyId },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ drivers });
  } catch (error) {
    logger.error('Error fetching transport drivers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transport drivers' },
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

    // Only parents can create drivers
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can create transport drivers' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, phone, relationship } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Create driver
    const driver = await prisma.transportDriver.create({
      data: {
        familyId: session.user.familyId,
        name: name.trim(),
        phone: phone?.trim() || null,
        relationship: relationship?.trim() || null,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'TRANSPORT_DRIVER_ADDED',
        result: 'SUCCESS',
        metadata: {
          driverId: driver.id,
          name: driver.name,
        },
      },
    });

    return NextResponse.json(
      { driver, message: 'Transport driver created successfully' },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating transport driver:', error);
    return NextResponse.json(
      { error: 'Failed to create transport driver' },
      { status: 500 }
    );
  }
}
