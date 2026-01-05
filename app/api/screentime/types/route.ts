import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sanitizeString } from '@/lib/input-sanitization';
import { parseJsonBody } from '@/lib/request-validation';

/**
 * GET /api/screentime/types
 * List all screen time types for the family
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const types = await prisma.screenTimeType.findMany({
      where: {
        familyId: session.user.familyId,
        isArchived: false,
      },
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({ types });
  } catch (error) {
    logger.error('Error fetching screen time types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch screen time types' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/screentime/types
 * Create a new screen time type (parents only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can create types
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can create screen time types' },
        { status: 403 }
      );
    }

    // Validate and parse JSON body
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return NextResponse.json(
        { error: bodyResult.error },
        { status: bodyResult.status }
      );
    }
    const { name, description } = bodyResult.data;

    // Sanitize input
    const sanitizedName = sanitizeString(name);
    if (!sanitizedName || sanitizedName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const sanitizedDescription = description ? sanitizeString(description) : null;

    // Check for duplicate name
    const existing = await prisma.screenTimeType.findFirst({
      where: {
        familyId: session.user.familyId,
        name: sanitizedName,
        isArchived: false,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A screen time type with this name already exists' },
        { status: 400 }
      );
    }

    const type = await prisma.screenTimeType.create({
      data: {
        familyId: session.user.familyId,
        name: sanitizedName,
        description: sanitizedDescription,
        isActive: true,
        isArchived: false,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'SCREENTIME_TYPE_CREATED',
        result: 'SUCCESS',
        metadata: {
          typeId: type.id,
          typeName: type.name,
        },
      },
    });

    return NextResponse.json(
      { type, message: 'Screen time type created successfully' },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating screen time type:', error);
    return NextResponse.json(
      { error: 'Failed to create screen time type' },
      { status: 500 }
    );
  }
}
