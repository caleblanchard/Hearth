import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { TempMethod } from '@/app/generated/prisma';
import { logger } from '@/lib/logger';

const VALID_METHODS: TempMethod[] = ['ORAL', 'RECTAL', 'ARMPIT', 'EAR', 'FOREHEAD'];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const limit = parseInt(searchParams.get('limit') || '100');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query
    const where: any = {};

    // If memberId provided, filter by it
    if (memberId) {
      // Verify member belongs to family
      const member = await prisma.familyMember.findUnique({
        where: { id: memberId },
        select: { id: true, familyId: true },
      });

      if (!member || member.familyId !== session.user.familyId) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      where.memberId = memberId;
    } else {
      // Get all family members' temperature logs
      const familyMembers = await prisma.familyMember.findMany({
        where: { familyId: session.user.familyId },
        select: { id: true },
      });

      where.memberId = {
        in: familyMembers.map((m) => m.id),
      };
    }

    // Date filtering
    if (startDate || endDate) {
      where.recordedAt = {};
      if (startDate) {
        where.recordedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.recordedAt.lte = new Date(endDate);
      }
    }

    // Fetch temperature logs
    const logs = await prisma.temperatureLog.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        recordedAt: 'desc',
      },
      take: limit,
    });

    return NextResponse.json({ logs }, { status: 200 });
  } catch (error) {
    logger.error('Error fetching temperature logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch temperature logs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { memberId, temperature, method, notes } = body;

    // Validate required fields
    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    if (temperature === undefined || temperature === null) {
      return NextResponse.json({ error: 'Temperature is required' }, { status: 400 });
    }

    if (!method) {
      return NextResponse.json({ error: 'Method is required' }, { status: 400 });
    }

    if (!VALID_METHODS.includes(method)) {
      return NextResponse.json({ error: 'Invalid method' }, { status: 400 });
    }

    // Validate temperature range (Fahrenheit)
    if (temperature < 90 || temperature > 110) {
      return NextResponse.json(
        { error: 'Temperature must be between 90 and 110 degrees Fahrenheit' },
        { status: 400 }
      );
    }

    // Children can only log temperature for themselves
    if (session.user.role === 'CHILD' && session.user.id !== memberId) {
      return NextResponse.json(
        { error: 'Children can only log temperature for themselves' },
        { status: 403 }
      );
    }

    // Verify member belongs to family
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      select: { id: true, familyId: true },
    });

    if (!member || member.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Create temperature log
    const log = await prisma.temperatureLog.create({
      data: {
        memberId,
        temperature,
        method,
        notes,
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'TEMPERATURE_LOGGED',
        entityType: 'TemperatureLog',
        entityId: log.id,
        result: 'SUCCESS',
      },
    });

    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    logger.error('Error logging temperature:', error);
    return NextResponse.json(
      { error: 'Failed to log temperature' },
      { status: 500 }
    );
  }
}
