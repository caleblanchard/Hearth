import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
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

    const lookAheadDays = 7; // Generate instances for next 7 days
    const startDate = new Date();
    let created = 0;
    let skipped = 0;
    let skippedDueToSickMode = 0;
    const errors: string[] = [];

    // Fetch all active chore schedules
    const schedules = await prisma.choreSchedule.findMany({
      where: {
        isActive: true,
        choreDefinition: {
          isActive: true,
        },
      },
      include: {
        choreDefinition: true,
        assignments: {
          where: {
            isActive: true,
          },
          orderBy: {
            rotationOrder: 'asc',
          },
          include: {
            member: true,
          },
        },
      },
    });

    // Process each schedule
    for (const schedule of schedules) {
      try {
        // Skip if no active assignments
        if (schedule.assignments.length === 0) {
          console.log(`Skipping schedule ${schedule.id} - no active assignments`);
          continue;
        }

        // Calculate due dates for this schedule
        const dueDates = getNextDueDates(
          schedule.frequency,
          startDate,
          lookAheadDays,
          schedule.dayOfWeek
        );

        // For each due date, create instance if it doesn't exist
        for (const dueDate of dueDates) {
          // Check if instance already exists for this schedule and date
          const existingInstance = await prisma.choreInstance.findFirst({
            where: {
              choreScheduleId: schedule.id,
              dueDate: {
                gte: startOfDay(dueDate),
                lt: endOfDay(dueDate),
              },
            },
          });

          if (existingInstance) {
            skipped++;
            continue;
          }

          // Determine who should be assigned
          let assigneeId: string | null = null;

          if (schedule.assignmentType === 'FIXED') {
            // FIXED: Always assign to first person in list
            assigneeId = schedule.assignments[0].memberId;

            // Check if member is in sick mode
            const inSickMode = await isMemberInSickMode(assigneeId);
            if (inSickMode) {
              skippedDueToSickMode++;
              logger.info(`Skipping chore instance for member ${assigneeId} - in sick mode`);
              continue;
            }

            // Create single instance
            await prisma.choreInstance.create({
              data: {
                choreScheduleId: schedule.id,
                assignedToId: assigneeId,
                dueDate: dueDate,
                status: 'PENDING',
              },
            });
            created++;

          } else if (schedule.assignmentType === 'ROTATING') {
            // ROTATING: Find last instance and rotate to next person
            const lastInstance = await prisma.choreInstance.findFirst({
              where: {
                choreScheduleId: schedule.id,
              },
              orderBy: {
                dueDate: 'desc',
              },
            });

            assigneeId = getNextAssignee(
              schedule.assignments,
              lastInstance?.assignedToId || null
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
            await prisma.choreInstance.create({
              data: {
                choreScheduleId: schedule.id,
                assignedToId: assigneeId,
                dueDate: dueDate,
                status: 'PENDING',
              },
            });
            created++;

          } else if (schedule.assignmentType === 'OPT_IN') {
            // OPT_IN: Create instance for EACH assigned member
            for (const assignment of schedule.assignments) {
              // Check if this specific member already has an instance for this date
              const memberInstance = await prisma.choreInstance.findFirst({
                where: {
                  choreScheduleId: schedule.id,
                  assignedToId: assignment.memberId,
                  dueDate: {
                    gte: startOfDay(dueDate),
                    lt: endOfDay(dueDate),
                  },
                },
              });

              if (!memberInstance) {
                // Check if member is in sick mode
                const inSickMode = await isMemberInSickMode(assignment.memberId);
                if (inSickMode) {
                  skippedDueToSickMode++;
                  logger.info(`Skipping opt-in chore for member ${assignment.memberId} - in sick mode`);
                  continue;
                }

                await prisma.choreInstance.create({
                  data: {
                    choreScheduleId: schedule.id,
                    assignedToId: assignment.memberId,
                    dueDate: dueDate,
                    status: 'PENDING',
                  },
                });
                created++;
              } else {
                skipped++;
              }
            }
          }
        }
      } catch (error) {
        logger.error('Error processing schedule ${schedule.id}:', error);
        errors.push(`Schedule ${schedule.id}: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        schedulesProcessed: schedules.length,
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
