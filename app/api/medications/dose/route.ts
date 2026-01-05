import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { onMedicationGiven } from '@/lib/rules-engine/hooks';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { medicationSafetyId, dosage, notes, override, overrideReason } = body;

    if (!medicationSafetyId || !dosage) {
      return NextResponse.json(
        { error: 'Medication Safety ID and dosage are required' },
        { status: 400 }
      );
    }

    // Get medication safety config
    const medSafety = await prisma.medicationSafety.findUnique({
      where: { id: medicationSafetyId },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            familyId: true,
          },
        },
      },
    });

    if (!medSafety) {
      return NextResponse.json(
        { error: 'Medication safety configuration not found' },
        { status: 404 }
      );
    }

    // Verify member belongs to user's family
    if (medSafety.member.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const now = new Date();

    // SAFETY INTERLOCK CHECK
    if (medSafety.nextDoseAvailableAt && medSafety.nextDoseAvailableAt > now && !override) {
      const hoursRemaining = (medSafety.nextDoseAvailableAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      return NextResponse.json(
        {
          error: 'Dose locked - minimum interval not met',
          locked: true,
          nextDoseAvailableAt: medSafety.nextDoseAvailableAt,
          hoursRemaining: hoursRemaining.toFixed(2),
        },
        { status: 400 }
      );
    }

    // Check daily maximum
    if (medSafety.maxDosesPerDay) {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const dosesToday = await prisma.medicationDose.count({
        where: {
          medicationSafetyId,
          givenAt: {
            gte: startOfDay,
          },
        },
      });

      if (dosesToday >= medSafety.maxDosesPerDay && !override) {
        return NextResponse.json(
          {
            error: `Daily maximum of ${medSafety.maxDosesPerDay} doses reached`,
            locked: true,
            dosesToday,
            maxDosesPerDay: medSafety.maxDosesPerDay,
          },
          { status: 400 }
        );
      }
    }

    // Parent override validation
    if (override) {
      if (session.user.role !== 'PARENT') {
        return NextResponse.json(
          { error: 'Only parents can override medication safety interlock' },
          { status: 403 }
        );
      }

      if (!overrideReason) {
        return NextResponse.json(
          { error: 'Override reason is required' },
          { status: 400 }
        );
      }
    }

    // Calculate next available dose time
    const nextAvailable = new Date(now);
    nextAvailable.setHours(nextAvailable.getHours() + medSafety.minIntervalHours);

    // Log the dose
    const dose = await prisma.medicationDose.create({
      data: {
        medicationSafetyId,
        givenAt: now,
        givenBy: session.user.id,
        dosage: dosage.trim(),
        notes: notes?.trim() || null,
        wasOverride: override || false,
        overrideReason: override ? overrideReason.trim() : null,
        overrideApprovedBy: override ? session.user.id : null,
      },
    });

    // Update medication safety record
    await prisma.medicationSafety.update({
      where: { id: medicationSafetyId },
      data: {
        lastDoseAt: now,
        nextDoseAvailableAt: nextAvailable,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: override ? 'MEDICATION_DOSE_OVERRIDE' : 'MEDICATION_DOSE_LOGGED',
        result: 'SUCCESS',
        metadata: {
          doseId: dose.id,
          medicationName: medSafety.medicationName,
          memberName: medSafety.member.name,
          dosage,
          wasOverride: override || false,
        },
      },
    });

    // Trigger rules engine evaluation (async, fire-and-forget)
    try {
      await onMedicationGiven(
        {
          id: dose.id,
          medicationId: medicationSafetyId,
          memberId: medSafety.member.id,
          givenAt: now,
        },
        session.user.familyId
      );
    } catch (error) {
      logger.error('Rules engine hook error:', error);
      // Don't fail the dose logging if rules engine fails
    }

    return NextResponse.json({
      dose,
      nextDoseAvailableAt: nextAvailable,
      message: 'Dose logged successfully',
    });
  } catch (error) {
    logger.error('Error logging medication dose:', error);
    return NextResponse.json(
      { error: 'Failed to log medication dose' },
      { status: 500 }
    );
  }
}
