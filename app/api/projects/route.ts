import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sanitizeString } from '@/lib/input-sanitization';
import { parsePaginationParams, createPaginationResponse } from '@/lib/pagination';
import { parseJsonBody } from '@/lib/request-validation';

const VALID_STATUSES = ['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can manage projects
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can manage projects' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {
      familyId: session.user.familyId,
    };

    if (status) {
      where.status = status;
    }

    // Parse pagination
    const { page, limit } = parsePaginationParams(request.nextUrl.searchParams);
    const skip = (page - 1) * limit;

    // Fetch projects with pagination
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              tasks: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.project.count({ where }),
    ]);

    return NextResponse.json(createPaginationResponse(projects, page, limit, total));
  } catch (error) {
    logger.error('Error fetching projects', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
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

    // Only parents can create projects
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can create projects' },
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
    const {
      name,
      description,
      status,
      startDate,
      dueDate,
      budget,
      notes,
    } = bodyResult.data;

    // Sanitize and validate input
    const sanitizedName = sanitizeString(name);
    if (!sanitizedName || sanitizedName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const sanitizedDescription = description ? sanitizeString(description) : null;
    const sanitizedNotes = notes ? sanitizeString(notes) : null;

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate budget
    if (budget !== undefined && budget !== null && budget < 0) {
      return NextResponse.json(
        { error: 'Budget must be a positive number' },
        { status: 400 }
      );
    }

    // Validate dates
    if (startDate && dueDate) {
      const start = new Date(startDate);
      const due = new Date(dueDate);
      if (due < start) {
        return NextResponse.json(
          { error: 'Due date must be after start date' },
          { status: 400 }
        );
      }
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        familyId: session.user.familyId,
        name: sanitizedName,
        description: sanitizedDescription,
        status: status || 'ACTIVE',
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        budget: budget !== undefined && budget !== null ? parseFloat(String(budget)) : null,
        notes: sanitizedNotes,
        createdById: session.user.id,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'PROJECT_CREATED',
        result: 'SUCCESS',
        metadata: {
          projectId: project.id,
          name: project.name,
          status: project.status,
        },
      },
    });

    return NextResponse.json(
      { project, message: 'Project created successfully' },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating project', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
