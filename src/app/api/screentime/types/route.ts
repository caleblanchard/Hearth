import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getScreenTimeTypes, createScreenTimeType } from '@/lib/data/screentime';
import { logger } from '@/lib/logger';
import { sanitizeString } from '@/lib/input-sanitization';
import { parseJsonBody } from '@/lib/request-validation';

const normalizeScreenTimeType = (type: any) => ({
  id: type.id,
  familyId: type.family_id ?? type.familyId,
  name: type.name,
  description: type.description ?? null,
  isActive: type.is_active ?? type.isActive ?? false,
  isArchived: type.is_archived ?? type.isArchived ?? false,
  createdAt: type.created_at ?? type.createdAt,
  updatedAt: type.updated_at ?? type.updatedAt,
  _count: type._count,
});

/**
 * GET /api/screentime/types
 * List all screen time types for the family
 */
export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const types = await getScreenTimeTypes(familyId);

    return NextResponse.json({ types: types.map(normalizeScreenTimeType) });
  } catch (error) {
    logger.error('Error fetching screen time types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch screen time types' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Validate and parse JSON body
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return NextResponse.json(
        { error: bodyResult.error },
        { status: bodyResult.status }
      );
    }
    const { name, description, icon, color } = bodyResult.data;

    // Sanitize and validate
    const sanitizedName = sanitizeString(name);
    if (!sanitizedName || sanitizedName.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const type = await createScreenTimeType({
      family_id: familyId,
      name: sanitizedName,
      description: description ? sanitizeString(description) : null,
      is_active: true,
      is_archived: false,
    });

    return NextResponse.json({
      success: true,
      type: normalizeScreenTimeType(type),
      message: 'Screen time type created successfully',
    });
  } catch (error) {
    logger.error('Error creating screen time type:', error);
    return NextResponse.json(
      { error: 'Failed to create screen time type' },
      { status: 500 }
    );
  }
}
