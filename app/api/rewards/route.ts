import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sanitizeString, sanitizeInteger } from '@/lib/input-sanitization';
import { parsePaginationParams, createPaginationResponse } from '@/lib/pagination';
import { parseJsonBody } from '@/lib/request-validation';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId } = session.user;

    // Parse pagination
    const { page, limit } = parsePaginationParams(request.nextUrl.searchParams);
    const skip = (page - 1) * limit;

    // Fetch active rewards for the family with pagination
    const [rewards, total] = await Promise.all([
      prisma.rewardItem.findMany({
        where: {
          familyId,
          status: 'ACTIVE',
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              redemptions: {
                where: {
                  status: {
                    in: ['PENDING', 'APPROVED'],
                  },
                },
              },
            },
          },
        },
        orderBy: [
          { costCredits: 'asc' },
          { name: 'asc' },
        ],
        skip,
        take: limit,
      }),
      prisma.rewardItem.count({
        where: {
          familyId,
          status: 'ACTIVE',
        },
      }),
    ]);

    return NextResponse.json(createPaginationResponse(rewards, page, limit, total));
  } catch (error) {
    logger.error('Rewards API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rewards' },
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

    // Only parents can create rewards
    if (session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate and parse JSON body
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return NextResponse.json(
        { error: bodyResult.error },
        { status: bodyResult.status }
      );
    }
    const { name, description, category, costCredits, quantity, imageUrl } = bodyResult.data;

    // Sanitize and validate input
    const sanitizedName = sanitizeString(name);
    if (!sanitizedName || sanitizedName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const sanitizedDescription = description ? sanitizeString(description) : null;
    const sanitizedImageUrl = imageUrl ? sanitizeString(imageUrl) : null;
    
    const sanitizedCostCredits = sanitizeInteger(costCredits, 0);
    if (sanitizedCostCredits === null) {
      return NextResponse.json(
        { error: 'Valid cost in credits is required' },
        { status: 400 }
      );
    }

    const sanitizedQuantity = quantity != null ? sanitizeInteger(quantity, 0) : null;

    const { familyId } = session.user;

    // Validate category
    const validCategories = ['PRIVILEGE', 'ITEM', 'EXPERIENCE', 'SCREEN_TIME', 'OTHER'];
    const sanitizedCategory = category && validCategories.includes(category) ? category : 'OTHER';

    // Create reward
    const reward = await prisma.rewardItem.create({
      data: {
        familyId,
        name: sanitizedName,
        description: sanitizedDescription,
        category: sanitizedCategory,
        costCredits: sanitizedCostCredits,
        quantity: sanitizedQuantity,
        imageUrl: sanitizedImageUrl,
        status: 'ACTIVE',
        createdById: session.user.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      reward,
      message: 'Reward created successfully',
    });
  } catch (error) {
    logger.error('Create reward error:', error);
    return NextResponse.json(
      { error: 'Failed to create reward' },
      { status: 500 }
    );
  }
}
