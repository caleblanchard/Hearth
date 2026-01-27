import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { testAutomationRule } from '@/lib/data/automation';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Check if user is a parent
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Forbidden - Parent access required' },
        { status: 403 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { context } = body;

    if (!context) {
      return NextResponse.json({ error: 'Missing context' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: rule } = await supabase
      .from('automation_rules')
      .select('family_id')
      .eq('id', id)
      .maybeSingle();

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    if (rule.family_id !== familyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const testContext = {
      ...context,
      familyId,
    };

    const result = await testAutomationRule(id, testContext);

    // Create audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'RULE_TEST_RUN',
      entity_type: 'AutomationRule',
      entity_id: id,
      result: 'SUCCESS',
      details: {
        context: testContext
      }
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error('Test rule error:', error);
    return NextResponse.json({ error: 'Failed to test rule' }, { status: 500 });
  }
}
