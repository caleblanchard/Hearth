import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { toggleAutomationRule } from '@/lib/data/automation';
import { logger } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string } }
) {
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

    // Check if user is a parent
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Forbidden - Parent access required' },
        { status: 403 }
      );
    }

    // Fetch the rule
    const { data: rule } = await supabase
      .from('automation_rules')
      .select('family_id, is_enabled')
      .eq('id', params.id)
      .single();

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    if (rule.family_id !== familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Toggle the rule
    const updatedRule = await toggleAutomationRule(params.id);

    // Audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: updatedRule.is_enabled ? 'RULE_ENABLED' : 'RULE_DISABLED',
      entity_type: 'RULE',
      entity_id: params.id,
      result: 'SUCCESS',
      metadata: { previousState: rule.is_enabled },
    });

    return NextResponse.json({
      success: true,
      rule: updatedRule,
      message: `Rule ${updatedRule.is_enabled ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    logger.error('Toggle rule error:', error);
    return NextResponse.json({ error: 'Failed to toggle rule' }, { status: 500 });
  }
}
