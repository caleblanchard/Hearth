/**
 * Cron Endpoint: /api/cron/evaluate-time-rules
 *
 * Evaluates time-based automation rules on a schedule
 * Should be called every minute by a cron job or scheduled task
 *
 * Authentication: Bearer token with CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { evaluateRules } from '@/lib/rules-engine';
import { logger } from '@/lib/logger';

/**
 * Check if a cron expression matches the current time
 * Supports basic cron patterns and special keywords
 *
 * Format: minute hour day month dayOfWeek
 * Examples:
 *   "0 9 * * 0" - Every Sunday at 9 AM
 *   "0 0 * * *" - Every day at midnight
 *   Every 15 minutes: "*" + "/15 * * * *"
 *
 * Special keywords:
 *   "birthday" - Member's birthday (handled separately)
 */
function matchesCronExpression(cronExpression: string, currentDate: Date): boolean {
  // Special case: birthday (will be handled separately with member data)
  if (cronExpression === 'birthday') {
    return false; // Birthday rules need member context
  }

  try {
    const parts = cronExpression.split(' ');
    if (parts.length !== 5) return false;

    const [minute, hour, day, month, dayOfWeek] = parts;

    const currentMinute = currentDate.getMinutes();
    const currentHour = currentDate.getHours();
    const currentDay = currentDate.getDate();
    const currentMonth = currentDate.getMonth() + 1; // JS months are 0-indexed
    const currentDayOfWeek = currentDate.getDay(); // 0 = Sunday

    // Helper to check if a cron field matches
    const matches = (cronField: string, value: number, max: number): boolean => {
      if (cronField === '*') return true;
      if (cronField.includes('/')) {
        // Handle step values like */15
        const [base, step] = cronField.split('/');
        const stepNum = parseInt(step, 10);
        if (base === '*') return value % stepNum === 0;
        return false;
      }
      if (cronField.includes(',')) {
        // Handle lists like 1,15,30
        return cronField.split(',').some(v => parseInt(v, 10) === value);
      }
      if (cronField.includes('-')) {
        // Handle ranges like 1-5
        const [start, end] = cronField.split('-').map(v => parseInt(v, 10));
        return value >= start && value <= end;
      }
      return parseInt(cronField, 10) === value;
    };

    return (
      matches(minute, currentMinute, 59) &&
      matches(hour, currentHour, 23) &&
      matches(day, currentDay, 31) &&
      matches(month, currentMonth, 12) &&
      matches(dayOfWeek, currentDayOfWeek, 6)
    );
  } catch (error) {
    logger.error('Error parsing cron expression', { cronExpression, error });
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const expectedSecret = process.env.CRON_SECRET;
    if (!expectedSecret) {
      logger.error('CRON_SECRET environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token || token !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const currentDate = new Date();
    let evaluated = 0;
    let executed = 0;
    let skipped = 0;
    let errors = 0;

    // Find all enabled time-based rules
    const { data: timeRules } = await supabase
      .from('automation_rules')
      .select('id, name, family_id, trigger')
      .eq('is_enabled', true)
      .eq('trigger->type', 'time_based');

    logger.info('Evaluating time-based rules', {
      count: timeRules?.length || 0,
      timestamp: currentDate.toISOString(),
    });

    // Process each rule
    for (const rule of timeRules || []) {
      try {
        evaluated++;

        const triggerConfig = rule.trigger as any;
        const cronExpression = triggerConfig.config?.cron;

        if (!cronExpression) {
          logger.warn('Time-based rule missing cron expression', { ruleId: rule.id, ruleName: rule.name });
          skipped++;
          continue;
        }

        // Check if cron expression matches current time
        const shouldExecute = matchesCronExpression(cronExpression, currentDate);

        if (shouldExecute) {
          logger.info('Executing time-based rule', {
            ruleId: rule.id,
            ruleName: rule.name,
            cronExpression,
          });

          // Trigger rule evaluation
          await evaluateRules('time_based', {
            ruleId: rule.id,
            familyId: rule.family_id,
            timestamp: currentDate,
            triggerId: `time-${rule.id}-${currentDate.toISOString()}`,
          });

          executed++;
        } else {
          skipped++;
        }
      } catch (error) {
        logger.error('Error processing time-based rule', {
          ruleId: rule.id,
          ruleName: rule.name,
          error,
        });
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      evaluated,
      executed,
      skipped,
      errors,
      totalRules: timeRules?.length || 0,
      timestamp: currentDate.toISOString(),
    });
  } catch (error) {
    logger.error('Evaluate time-based rules cron error', error);
    return NextResponse.json(
      {
        error: 'Failed to evaluate time-based rules',
      },
      { status: 500 }
    );
  }
}
