import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getActiveLeftovers, createLeftover } from '@/lib/data/meals';
import { logger } from '@/lib/logger';

const DEFAULT_EXPIRY_DAYS = 3;

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Use data module
    const leftovers = await getActiveLeftovers(familyId);

    return NextResponse.json({ leftovers });
  } catch (error) {
    logger.error('Error fetching leftovers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leftovers' },
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

    const familyId = authContext.defaultFamilyId;
    const memberId = authContext.defaultMemberId;
    
    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const body = await request.json();
    const { name, quantity, daysUntilExpiry, notes, mealPlanEntryId } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Calculate expiration date
    const now = new Date();
    const expiryDays = daysUntilExpiry || DEFAULT_EXPIRY_DAYS;
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    // Use data module
    const leftover = await createLeftover({
      family_id: familyId,
      name: name.trim(),
      quantity: quantity?.trim() || null,
      stored_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      notes: notes?.trim() || null,
      meal_plan_entry_id: mealPlanEntryId || null,
      created_by: memberId,
    });

    // Create audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'LEFTOVER_LOGGED',
      entity_type: 'LEFTOVER',
      entity_id: leftover.id,
      result: 'SUCCESS',
      metadata: {
        leftoverId: leftover.id,
        name: leftover.name,
        expiresAt: leftover.expires_at,
      },
    });

    return NextResponse.json(
      {
        leftover,
        message: 'Leftover logged successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating leftover:', error);
    return NextResponse.json(
      { error: 'Failed to create leftover' },
      { status: 500 }
    );
  }
}
