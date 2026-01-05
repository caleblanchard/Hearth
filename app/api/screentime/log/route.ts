import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { onScreenTimeUpdated } from '@/lib/rules-engine/hooks';
import { wouldExceedAllowance, calculateRemainingTime, getWeekStart } from '@/lib/screentime-utils';
import { logger } from '@/lib/logger';
import { sanitizeString, sanitizeInteger } from '@/lib/input-sanitization';
import { parseJsonBody } from '@/lib/request-validation';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      minutes: rawMinutes,
      screenTimeTypeId: rawScreenTimeTypeId,
      deviceType: rawDeviceType,
      notes: rawNotes,
      loggedAt, // Optional: for retroactive logging
      override, // Optional: parent override
      overrideReason: rawOverrideReason, // Required if override is true
    } = bodyResult.data;

    // Sanitize and validate input
    const minutes = sanitizeInteger(rawMinutes, 1);
    if (minutes === null) {
      return NextResponse.json(
        { error: 'Minutes must be a positive integer' },
        { status: 400 }
      );
    }

    const screenTimeTypeId = sanitizeString(rawScreenTimeTypeId);
    if (!screenTimeTypeId) {
      return NextResponse.json(
        { error: 'Screen time type is required' },
        { status: 400 }
      );
    }

    const deviceType = rawDeviceType ? sanitizeString(rawDeviceType) : 'OTHER';
    const notes = rawNotes ? sanitizeString(rawNotes) : null;
    const overrideReason = rawOverrideReason ? sanitizeString(rawOverrideReason) : null;

    const { id: memberId } = session.user;
    const loggedDate = loggedAt ? new Date(loggedAt) : new Date();
    
    // Validate date
    if (isNaN(loggedDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Verify screen time type belongs to family
    const type = await prisma.screenTimeType.findFirst({
      where: {
        id: screenTimeTypeId,
        familyId: session.user.familyId,
        isArchived: false,
      },
    });

    if (!type) {
      return NextResponse.json(
        { error: 'Screen time type not found or is archived' },
        { status: 400 }
      );
    }

    // Check if allowance exists
    const allowance = await prisma.screenTimeAllowance.findUnique({
      where: {
        memberId_screenTimeTypeId: {
          memberId,
          screenTimeTypeId,
        },
      },
    });

    if (!allowance) {
      return NextResponse.json(
        { error: 'No allowance configured for this screen time type' },
        { status: 400 }
      );
    }

    // Check if this would exceed the allowance
    const exceedCheck = await wouldExceedAllowance(
      memberId,
      screenTimeTypeId,
      minutes,
      loggedDate
    );

    // Convert override to boolean
    // Handle various truthy values: true, 'true', 1, '1', 'True'
    // Also handle undefined/null/false/0/'false'/'0' as false
    const isOverride = override === true || override === 'true' || override === 1 || override === '1' || override === 'True';

    // If override is true, verify user is a parent first
    if (isOverride && session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can override screen time limits' },
        { status: 403 }
      );
    }

    // Handle override case: if override is true, require overrideReason when would exceed
    if (isOverride) {
      if (exceedCheck.wouldExceed && (!overrideReason || !overrideReason.trim())) {
        return NextResponse.json(
          { error: 'Override reason is required when exceeding allowance' },
          { status: 400 }
        );
      }
      // Parent override is valid, skip the "would exceed" check and proceed to transaction
    } else if (exceedCheck.wouldExceed) {
      // If it would exceed and not an override, require parent approval
      if (session.user.role !== 'PARENT') {
        return NextResponse.json(
          {
            error: 'This would exceed your allowance. Parent override required.',
            wouldExceed: true,
            remainingBefore: exceedCheck.remainingBefore,
            remainingAfter: exceedCheck.remainingAfter,
            allowanceMinutes: exceedCheck.allowanceMinutes,
          },
          { status: 403 }
        );
      }
      // Parent can override, but we still need overrideReason
      if (!overrideReason || !overrideReason.trim()) {
        return NextResponse.json(
          { error: 'Override reason is required when exceeding allowance' },
          { status: 400 }
        );
      }
    }

    // Use transaction to prevent race conditions
    // All operations are atomic and isolated
    const result = await prisma.$transaction(async (tx) => {
      // Re-check allowance within transaction to prevent race conditions
      const exceedCheck = await wouldExceedAllowance(
        memberId,
        screenTimeTypeId,
        minutes,
        loggedDate
      );

      // Handle override case: if override is true, require overrideReason
      if (isOverride) {
        if (!overrideReason || !overrideReason.trim()) {
          const error: any = new Error('OVERRIDE_REASON_REQUIRED');
          error.status = 400;
          error.data = {
            error: 'Override reason is required when exceeding allowance',
          };
          throw error;
        }
        // Parent override is valid, skip the "would exceed" check and proceed
      } else if (exceedCheck.wouldExceed) {
        if (session.user.role !== 'PARENT') {
          const error: any = new Error('EXCEEDS_ALLOWANCE');
          error.status = 403;
          error.data = {
            error: 'This would exceed your allowance. Parent override required.',
            wouldExceed: true,
            remainingBefore: exceedCheck.remainingBefore,
            remainingAfter: exceedCheck.remainingAfter,
            allowanceMinutes: exceedCheck.allowanceMinutes,
          };
          throw error;
        }
        // Parent can override, but we still need overrideReason
        if (!overrideReason || !overrideReason.trim()) {
          const error: any = new Error('OVERRIDE_REASON_REQUIRED');
          error.status = 400;
          error.data = {
            error: 'Override reason is required when exceeding allowance',
          };
          throw error;
        }
      }

      // Calculate remaining time after this log (within transaction)
      const remaining = await calculateRemainingTime(
        memberId,
        screenTimeTypeId,
        loggedDate
      );

      const newRemaining = Math.max(0, remaining.remainingMinutes - minutes);

      // Get or create balance (for backward compatibility with old system)
      let balance = await tx.screenTimeBalance.findUnique({
        where: { memberId },
      });

      if (!balance) {
        // Create balance if it doesn't exist
        const weekStart = await getWeekStart(new Date(), session.user.familyId);
        balance = await tx.screenTimeBalance.create({
          data: {
            memberId,
            currentBalanceMinutes: 0,
            weekStartDate: weekStart,
          },
        });
      }

      // Update balance (for backward compatibility)
      const updatedBalance = await tx.screenTimeBalance.update({
        where: { memberId },
        data: {
          currentBalanceMinutes: Math.max(0, balance.currentBalanceMinutes - minutes),
        },
      });

      // Log transaction
      const transaction = await tx.screenTimeTransaction.create({
        data: {
          memberId,
          type: 'SPENT',
          amountMinutes: -minutes,
          balanceAfter: updatedBalance.currentBalanceMinutes,
          deviceType: deviceType || 'OTHER',
          screenTimeTypeId,
        notes: notes || null,
        wasOverride: isOverride || false,
        overrideReason: isOverride ? (overrideReason || null) : null,
          createdById: session.user.id,
          createdAt: loggedDate,
        },
      });

      // Log audit
      await tx.auditLog.create({
        data: {
          familyId: session.user.familyId,
          memberId: session.user.id,
          action: 'SCREENTIME_LOGGED',
          entityType: 'ScreenTimeTransaction',
          result: 'SUCCESS',
          metadata: {
            minutes,
            screenTimeTypeId,
            screenTimeTypeName: type.name,
            deviceType,
            newBalance: updatedBalance.currentBalanceMinutes,
            remainingMinutes: newRemaining,
            wasOverride: override || false,
          },
        },
      });

      return {
        updatedBalance,
        newRemaining,
        transaction,
      };
    }, {
      isolationLevel: 'Serializable', // Highest isolation level to prevent race conditions
      timeout: 10000, // 10 second timeout
    });

    // Trigger rules engine evaluation (async, fire-and-forget)
    // Do this outside the transaction to avoid blocking
    try {
      await onScreenTimeUpdated(memberId, session.user.familyId, result.updatedBalance.currentBalanceMinutes);
    } catch (error) {
      logger.error('Rules engine hook error', error);
      // Don't fail the logging if rules engine fails
    }

    return NextResponse.json({
      success: true,
      balance: result.updatedBalance.currentBalanceMinutes,
      remainingMinutes: result.newRemaining,
      message: `Logged ${minutes} minutes for ${type.name}. ${result.newRemaining} minutes remaining.`,
    });
  } catch (error: any) {
    logger.error('Screen time logging error', error);
    
    // Handle specific transaction errors
    if (error instanceof Error) {
      if (error.message === 'EXCEEDS_ALLOWANCE' || error.status === 403) {
        return NextResponse.json(
          error.data || {
            error: 'This would exceed your allowance. Parent override required.',
            wouldExceed: true,
          },
          { status: 403 }
        );
      }
      if (error.message === 'OVERRIDE_REASON_REQUIRED' || error.status === 400) {
        return NextResponse.json(
          error.data || {
            error: 'Override reason is required when exceeding allowance',
          },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to log screen time' },
      { status: 500 }
    );
  }
}
