import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { recordMedicationDose } from '@/lib/data/medications';
import { auth } from '@/lib/auth';
import { authenticateChildSession } from '@/lib/kiosk-auth';
import { dbMock } from '@/lib/test-utils/db-mock';

const useMockDb = process.env.NODE_ENV === 'test';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = (await auth()) ?? (await getAuthContext());
    const childAuth = session ? null : await authenticateChildSession();

    if (!session && !childAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = (session as any)?.activeMemberId ?? childAuth?.memberId;
    const familyId =
      (session as any)?.activeFamilyId ?? (session as any)?.user?.familyId ?? childAuth?.familyId;

    if (!memberId || !familyId) {
      return NextResponse.json({ error: 'No member found' }, { status: 400 });
    }

    const body = await request.json();
    const { medicationSafetyId, dosage, notes, override, overrideReason } = body;

    if (!medicationSafetyId || !dosage) {
      return NextResponse.json(
        { error: 'Medication Safety ID and dosage are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Load medication safety config with member info
    const medication = useMockDb
      ? await (dbMock as any).medicationSafety.findUnique({
          where: { id: medicationSafetyId },
          include: { member: true },
        })
      : (
          await supabase
            .from('medication_safety')
            .select(
              `
            *,
            member:family_members(id, family_id)
          `
            )
            .eq('id', medicationSafetyId)
            .single()
        ).data;

    if (!medication) {
      return NextResponse.json({ error: 'Medication safety configuration not found' }, { status: 404 });
    }

    if ((medication as any).member?.family_id !== undefined) {
      if ((medication as any).member?.family_id !== familyId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if ((medication as any).member?.familyId !== undefined) {
      if ((medication as any).member?.familyId !== familyId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const nextDoseAvailable =
      (medication as any).next_dose_available_at ??
      (medication as any).nextDoseAvailableAt ??
      null;
    const maxDosesPerDay =
      (medication as any).max_doses_per_day ?? (medication as any).maxDosesPerDay ?? null;
    const minIntervalHours =
      (medication as any).min_interval_hours ?? (medication as any).minIntervalHours ?? null;

    // Override handling (processed before lock checks to allow intentional overrides)
    if (override) {
      const isParent =
        (session as any)?.user?.role === 'PARENT' || (await isParentInFamily(familyId));
      if (!isParent) {
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

    // Lock checks (skipped if override is true)
    const now = new Date();
    if (!override && nextDoseAvailable && new Date(nextDoseAvailable) > now) {
      const hoursRemaining =
        (new Date(nextDoseAvailable).getTime() - now.getTime()) / (1000 * 60 * 60);
      return NextResponse.json(
        {
          error: 'Dose locked - minimum interval not met',
          locked: true,
          hoursRemaining,
        },
        { status: 400 }
      );
    }

    if (!override && maxDosesPerDay) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const dosesToday = useMockDb
        ? await (dbMock as any).medicationDose.count({
            where: {
              medicationSafetyId: medicationSafetyId,
              givenAt: {
                gte: startOfDay,
                lt: endOfDay,
              },
            },
          })
        : (
            await supabase
              .from('medication_doses')
              .select('*', { count: 'exact', head: true })
              .eq('medication_id', medicationSafetyId)
              .gte('given_at', startOfDay.toISOString())
              .lt('given_at', endOfDay.toISOString())
          ).count || 0;

      if ((dosesToday || 0) >= maxDosesPerDay) {
        return NextResponse.json(
          {
            error: `Daily maximum of ${maxDosesPerDay} doses reached`,
            locked: true,
            dosesToday: dosesToday || 0,
            maxDosesPerDay: maxDosesPerDay,
          },
          { status: 400 }
        );
      }
    }

    // Record dose
    const dose = useMockDb
      ? await (dbMock as any).medicationDose.create({
          data: {
            medicationSafetyId: medicationSafetyId,
            givenBy: memberId,
            dosage,
            notes: notes || null,
            wasOverride: override || false,
            overrideReason: overrideReason || null,
            overrideApprovedBy: override ? memberId : null,
          },
        })
      : await recordMedicationDose({
          medication_safety_id: medicationSafetyId,
          given_by: memberId,
          dosage,
          notes: notes || null,
          was_override: override || false,
          override_reason: overrideReason || null,
        });

    // Update medication safety with next dose time
    const nextDoseDate =
      minIntervalHours != null
        ? new Date(Date.now() + minIntervalHours * 60 * 60 * 1000)
        : null;

    const lastDoseAt = new Date();

    if (useMockDb) {
      await (dbMock as any).medicationSafety.update({
        where: { id: medicationSafetyId },
        data: {
          lastDoseAt,
          nextDoseAvailableAt: nextDoseDate ?? null,
        },
      });
    } else {
      await supabase
        .from('medication_safety')
        .update({
          last_dose_at: lastDoseAt.toISOString(),
          next_dose_available_at: nextDoseDate ? nextDoseDate.toISOString() : null,
        })
        .eq('id', medicationSafetyId);
    }

    // Audit log
    if (useMockDb) {
      await (dbMock as any).auditLog.create({
        data: {
          familyId,
          memberId,
          action: override ? 'MEDICATION_DOSE_OVERRIDE' : 'MEDICATION_DOSE_LOGGED',
          result: 'SUCCESS',
          metadata: {
            doseId: dose.id,
            medicationName: medication.medication_name || medication.medicationName,
            memberName: (medication as any).member?.name,
            dosage,
            wasOverride: !!override,
          },
        },
      });
    } else {
      await (supabase as any).from('audit_logs').insert({
        family_id: familyId,
        member_id: memberId,
        action: override ? 'MEDICATION_DOSE_OVERRIDE' : 'MEDICATION_DOSE_LOGGED',
        result: 'SUCCESS',
        metadata: {
          medicationId: medicationSafetyId,
          wasOverride: !!override,
        },
      });
    }

    return NextResponse.json({
      success: true,
      dose,
      message: 'Dose logged successfully',
      nextDoseAvailableAt: nextDoseDate,
    });
  } catch (error) {
    logger.error('Record medication dose error:', error);
    return NextResponse.json({ error: 'Failed to log medication dose' }, { status: 500 });
  }
}
