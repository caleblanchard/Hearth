import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getFamilyId } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);

    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Guests can view dashboard but with limited data
    if (authResult.isGuest) {
      // For guests, return limited dashboard data
      const familyId = getFamilyId(authResult);
      
      // Get basic family info only
      const { data: family } = await supabase
        .from('families')
        .select(`
          name,
          members:family_members!inner(
            id,
            name,
            role
          )
        `)
        .eq('id', familyId)
        .eq('members.is_active', true)
        .single();

      return NextResponse.json({
        chores: [],
        screenTime: null,
        credits: null,
        shopping: null,
        todos: [],
        events: [],
        projectTasks: [],
        family: family,
        isGuest: true,
        guestAccessLevel: authResult.guest?.accessLevel,
      });
    }

    const { familyId, id: memberId } = authResult.user!;

    // Fetch all pending/rejected chores for the user
    const { data: chores } = await supabase
      .from('chore_instances')
      .select(`
        *,
        chore_schedule:chore_schedules(
          *,
          chore_definition:chore_definitions(*)
        )
      `)
      .eq('assigned_to_id', memberId)
      .in('status', ['PENDING', 'REJECTED'])
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: true });

    // Fetch screen time balance
    const { data: screenTimeBalance } = await supabase
      .from('screen_time_balances')
      .select(`
        *,
        member:family_members(
          *,
          screen_time_settings:screen_time_settings(*)
        )
      `)
      .eq('member_id', memberId)
      .maybeSingle();

    // Fetch screen time allowances
    const { data: allowances } = await supabase
      .from('screen_time_allowances')
      .select(`
        *,
        screen_time_type:screen_time_types!inner(
          id,
          name,
          description
        )
      `)
      .eq('member_id', memberId)
      .eq('screen_time_type.is_active', true)
      .eq('screen_time_type.is_archived', false);

    // Calculate remaining time for each allowance
    const allowancesWithRemaining = await Promise.all(
      (allowances || []).map(async (allowance) => {
        try {
          const { calculateRemainingTime } = await import('@/lib/screentime-utils');
          const remaining = await calculateRemainingTime(memberId, allowance.screen_time_type_id);
          return {
            id: allowance.id,
            screenTimeTypeId: allowance.screen_time_type_id,
            screenTimeTypeName: allowance.screen_time_type.name,
            allowanceMinutes: allowance.allowance_minutes,
            period: allowance.period,
            remainingMinutes: remaining.remainingMinutes,
            usedMinutes: remaining.usedMinutes,
            rolloverMinutes: remaining.rolloverMinutes,
          };
        } catch (error) {
          logger.warn('Failed to calculate remaining time for allowance', {
            error: error instanceof Error ? error.message : String(error),
            allowanceId: allowance.id,
            memberId,
          });
          return {
            id: allowance.id,
            screenTimeTypeId: allowance.screen_time_type_id,
            screenTimeTypeName: allowance.screen_time_type.name,
            allowanceMinutes: allowance.allowance_minutes,
            period: allowance.period,
            remainingMinutes: allowance.allowance_minutes,
            usedMinutes: 0,
            rolloverMinutes: 0,
          };
        }
      })
    );

    // Fetch credit balance
    const { data: creditBalance } = await supabase
      .from('credit_balances')
      .select('*')
      .eq('member_id', memberId)
      .maybeSingle();

    // Fetch shopping list
    const { data: shoppingLists } = await supabase
      .from('shopping_lists')
      .select(`
        *,
        items:shopping_items!inner(
          *
        )
      `)
      .eq('family_id', familyId)
      .eq('is_active', true)
      .in('items.status', ['PENDING', 'IN_CART'])
      .order('items.priority', { ascending: false })
      .limit(1);

    // Fetch to-do items
    const { data: todos } = await supabase
      .from('todo_items')
      .select('*')
      .eq('family_id', familyId)
      .or(`assigned_to_id.eq.${memberId},assigned_to_id.is.null`)
      .in('status', ['PENDING', 'IN_PROGRESS'])
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true })
      .limit(5);

    // Fetch upcoming calendar events
    const { data: calendarEvents } = await supabase
      .from('calendar_events')
      .select(`
        *,
        assignments:calendar_event_assignments!inner(
          member_id
        )
      `)
      .eq('family_id', familyId)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(5);

    // Filter events for user
    const myEvents = (calendarEvents || []).filter(event =>
      event.assignments?.some((a: any) => a.member_id === memberId) || authResult.user!.role === 'PARENT'
    );

    // Fetch project tasks
    const { data: projectTasks } = await supabase
      .from('project_tasks')
      .select(`
        *,
        project:projects!inner(
          id,
          name,
          family_id
        )
      `)
      .eq('assignee_id', memberId)
      .eq('project.family_id', familyId)
      .in('status', ['PENDING', 'IN_PROGRESS', 'BLOCKED'])
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(5);

    return NextResponse.json({
      chores: (chores || []).map(chore => ({
        id: chore.id,
        name: chore.chore_schedule.chore_definition.name,
        description: chore.chore_schedule.chore_definition.description,
        status: chore.status,
        creditValue: chore.chore_schedule.chore_definition.credit_value,
        difficulty: chore.chore_schedule.chore_definition.difficulty,
        dueDate: chore.due_date,
        requiresApproval: chore.chore_schedule.requires_approval,
      })),
      screenTime: allowancesWithRemaining.length > 0 ? {
        currentBalance: allowancesWithRemaining.reduce((sum, a) => sum + a.remainingMinutes, 0),
        weeklyAllocation: allowancesWithRemaining
          .filter((a) => a.period === 'WEEKLY')
          .reduce((sum, a) => sum + a.allowanceMinutes, 0),
        weekStartDate: screenTimeBalance?.week_start_date,
        allowances: allowancesWithRemaining,
      } : null,
      credits: creditBalance ? {
        current: creditBalance.current_balance,
        lifetimeEarned: creditBalance.lifetime_earned,
        lifetimeSpent: creditBalance.lifetime_spent,
      } : null,
      shopping: shoppingLists?.[0] ? {
        id: shoppingLists[0].id,
        name: shoppingLists[0].name,
        itemCount: shoppingLists[0].items?.length || 0,
        urgentCount: shoppingLists[0].items?.filter((item: any) => item.priority === 'URGENT').length || 0,
        items: (shoppingLists[0].items || []).slice(0, 3).map((item: any) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          priority: item.priority,
          category: item.category,
        })),
      } : null,
      todos: (todos || []).map(todo => ({
        id: todo.id,
        title: todo.title,
        priority: todo.priority,
        dueDate: todo.due_date,
        status: todo.status,
      })),
      events: myEvents.map(event => ({
        id: event.id,
        title: event.title,
        startTime: event.start_time,
        endTime: event.end_time,
        location: event.location,
        color: event.color,
      })),
      projectTasks: (projectTasks || []).map(task => ({
        id: task.id,
        name: task.name,
        description: task.description,
        status: task.status,
        dueDate: task.due_date,
        projectId: task.project_id,
        projectName: task.project.name,
      })),
      isGuest: false,
    });
  } catch (error) {
    logger.error('Dashboard API error', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
