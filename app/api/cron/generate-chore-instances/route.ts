import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getNextDueDates, getNextAssignee, startOfDay, endOfDay } from '@/lib/chore-scheduler';
import { logger } from '@/lib/logger';
import { isMemberInSickMode } from '@/lib/sick-mode';

// This endpoint is called by Vercel Cron daily to generate chore instances
export async function GET(request: Request) {
  try {
    // Verify request is from Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const lookAheadDays = 7; // Generate instances for next 7 days
    const startDate = new Date();
    let created = 0;
    let skipped = 0;
    let skippedDueToSickMode = 0;
    const errors: string[] = [];

    // Fetch all active chore schedules
    const { data: schedules } = await supabase
      .from('chore_schedules')
      .select(`
        *,
        chore_definition:chore_definitions!inner(*),
        assignments:chore_assignments!inner(
          *,
          member:family_members(*)
        )
      `)
      .eq('is_active', true)
      .eq('chore_definition.is_active', true)
      .eq('assignments.is_active', true)
      .order('assignments.rotation_order', { ascending: true });

    // Process each schedule
    for (const schedule of schedules || []) {
      try {
        // Skip if no active assignments
        if (!schedule.assignments || schedule.assignments.length === 0) {
          console.log(`Skipping schedule ${schedule.id} - no active assignments`);
          continue;
        }

        // Calculate due dates for this schedule
        const dueDates = getNextDueDates(
          schedule.frequency,
          startDate,
          lookAheadDays,
          schedule.day_of_week
        );

        // For each due date, create instance if it doesn't exist
        for (const dueDate of dueDates) {
          // Check if instance already exists for this schedule and date
          const { data: existingInstance } = await supabase
            .from('chore_instances')
            .select('id')
            .eq('chore_schedule_id', schedule.id)
            .gte('due_date', startOfDay(dueDate).toISOString())
            .lt('due_date', endOfDay(dueDate).toISOString())
            .maybeSingle();

          if (existingInstance) {
            skipped++;
            continue;
          }

          // Determine who should be assigned
          let assigneeId: string | null = null;

          if (schedule.assignment_type === 'FIXED') {
            // FIXED: Always assign to first person in list
            assigneeId = schedule.assignments[0].member_id;

            // Check if member is in sick mode
            const inSickMode = await isMemberInSickMode(assigneeId);
            if (inSickMode) {
              skippedDueToSickMode++;
              logger.info(`Skipping chore instance for member ${assigneeId} - in sick mode`);
              continue;
            }

            // Create single instance
            await supabase
              .from('chore_instances')
              .insert({
                chore_schedule_id: schedule.id,
                assigned_to_id: assigneeId,
                due_date: dueDate.toISOString(),
                status: 'PENDING',
              });
            created++;

          } else if (schedule.assignment_type === 'ROTATING') {
            // ROTATING: Find last instance and rotate to next person
            const { data: lastInstance } = await supabase
              .from('chore_instances')
              .select('assigned_to_id')
              .eq('chore_schedule_id', schedule.id)
              .order('due_date', { ascending: false })
              .limit(1)
              .maybeSingle();

            assigneeId = getNextAssignee(
              schedule.assignments,
              lastInstance?.assigned_to_id || null
            );

            if (!assigneeId) {
              console.log(`Skipping schedule ${schedule.id} - no assignee found`);
              continue;
            }

            // Check if member is in sick mode
            const inSickMode = await isMemberInSickMode(assigneeId);
            if (inSickMode) {
              skippedDueToSickMode++;
              logger.info(`Skipping chore instance for member ${assigneeId} - in sick mode`);
              continue;
            }

            // Create single instance
            await supabase
              .from('chore_instances')
              .insert({
                chore_schedule_id: schedule.id,
                assigned_to_id: assigneeId,
                due_date: dueDate.toISOString(),
                status: 'PENDING',
              });
            created++;

          } else if (schedule.assignment_type === 'OPT_IN') {
            // OPT_IN: Create instance for EACH assigned member
            for (const assignment of schedule.assignments) {
              // Check if this specific member already has an instance for this date
              const { data: memberInstance } = await supabase
                .from('chore_instances')
                .select('id')
                .eq('chore_schedule_id', schedule.id)
                .eq('assigned_to_id', assignment.member_id)
                .gte('due_date', startOfDay(dueDate).toISOString())
                .lt('due_date', endOfDay(dueDate).toISOString())
                .maybeSingle();

              if (!memberInstance) {
                // Check if member is in sick mode
                const inSickMode = await isMemberInSickMode(assignment.member_id);
                if (inSickMode) {
                  skippedDueToSickMode++;
                  logger.info(`Skipping opt-in chore for member ${assignment.member_id} - in sick mode`);
                  continue;
                }

                await supabase
                  .from('chore_instances')
                  .insert({
                    chore_schedule_id: schedule.id,
                    assigned_to_id: assignment.member_id,
                    due_date: dueDate.toISOString(),
                    status: 'PENDING',
                  });
                created++;
              } else {
                skipped++;
              }
            }
          }
        }
      } catch (error) {
        logger.error(`Error processing schedule ${schedule.id}:`, error);
        errors.push(`Schedule ${schedule.id}: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        schedulesProcessed: schedules?.length || 0,
        instancesCreated: created,
        instancesSkipped: skipped,
        skippedDueToSickMode,
        errors: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    logger.error('Error generating chore instances:', error);
    return NextResponse.json({ error: 'Failed to generate chore instances' }, { status: 500 });
  }
}

// Allow POST as well for manual triggering
export async function POST(request: Request) {
  return GET(request);
}
