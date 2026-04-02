import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getMedications, createMedication } from '@/lib/data/medications';
import { auth } from '@/lib/auth';
import { authenticateChildSession, authenticateDeviceSecret } from '@/lib/kiosk-auth';
import { dbMock } from '@/lib/test-utils/db-mock';

const useMockDb = process.env.NODE_ENV === 'test';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = (await auth()) ?? (await getAuthContext());
    const childAuth = session ? null : await authenticateChildSession();
    const deviceAuth = session || childAuth ? null : await authenticateDeviceSecret();

    const familyId =
      (session as any)?.activeFamilyId ?? (session as any)?.user?.familyId ?? childAuth?.familyId ?? deviceAuth?.familyId;
    if (!familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId') || childAuth?.memberId;

    if (useMockDb) {
      const medications = await (dbMock as any).medicationSafety.findMany({
        where: {
          member: {
            familyId,
          },
          ...(memberId ? { memberId } : {}),
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
            },
          },
          doses: {
            take: 5,
            orderBy: {
              givenAt: 'desc',
            },
          },
        },
        orderBy: {
          medicationName: 'asc',
        },
      });
      return NextResponse.json({ medications });
    }

    const medications = await getMedications(familyId, memberId || undefined);

    return NextResponse.json({ medications });
  } catch (error) {
    logger.error('Error fetching medications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch medications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const session = (await auth()) ?? (await getAuthContext());
    const childAuth = session ? null : await authenticateChildSession();
    if (!session && !childAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = (session as any)?.activeFamilyId ?? (session as any)?.user?.familyId ?? childAuth?.familyId;
    const memberId = (session as any)?.activeMemberId ?? (session as any)?.user?.id ?? childAuth?.memberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can create medication safety configs
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can create medication safety configurations' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      memberId: targetMemberId,
      medicationName,
      activeIngredient,
      minIntervalHours,
      maxDosesPerDay,
      notifyWhenReady,
    } = body;

    if (!targetMemberId || !medicationName || !minIntervalHours) {
      return NextResponse.json(
        { error: 'Member ID, medication name, and minimum interval are required' },
        { status: 400 }
      );
    }

    // Verify member belongs to family
    if (useMockDb) {
      const member = await (dbMock as any).familyMember.findUnique({
        where: { id: targetMemberId },
      });
      if (!member || member.familyId !== familyId) {
        return NextResponse.json(
          { error: 'Member not found or does not belong to your family' },
          { status: 400 }
        );
      }
    } else {
      const { data: member } = await supabase
        .from('family_members')
        .select('id, family_id')
        .eq('id', targetMemberId)
        .single();

      if (!member || member.family_id !== familyId) {
        return NextResponse.json(
          { error: 'Member not found or does not belong to your family' },
          { status: 400 }
        );
      }
    }

    let medication: any;
    if (useMockDb) {
      medication = await (dbMock as any).medicationSafety.create({
        data: {
          memberId: targetMemberId,
          medicationName,
          activeIngredient: activeIngredient || null,
          minIntervalHours,
          maxDosesPerDay: maxDosesPerDay || null,
          notifyWhenReady: notifyWhenReady ?? false,
        },
        include: {
          member: {
            select: { id: true, name: true },
          },
        },
      });
    } else {
      const { data: medData, error: medError } = await (supabase as any)
        .from('medication_safety')
        .insert({
          member_id: targetMemberId,
          medication_name: medicationName,
          active_ingredient: activeIngredient || null,
          min_interval_hours: minIntervalHours,
          max_doses_per_day: maxDosesPerDay || null,
          notify_when_ready: notifyWhenReady ?? false,
        })
        .select('*')
        .single();

      if (medError) throw medError;
      medication = medData;
    }

    // Audit log
    if (useMockDb) {
      await (dbMock as any).auditLog.create({
        data: {
          familyId,
          memberId,
          action: 'MEDICATION_SAFETY_CREATED',
          result: 'SUCCESS',
          metadata: {
            medicationId: medication.id,
            medicationName,
            memberName: medication.member?.name,
          },
        },
      });
    } else {
      await (supabase as any).from('audit_logs').insert({
        family_id: familyId,
        member_id: memberId,
        action: 'MEDICATION_SAFETY_CREATED',
        result: 'SUCCESS',
        metadata: {
          medicationId: medication.id,
          medicationName,
          memberName: null,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        medication,
        message: 'Medication safety configuration created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating medication:', error);
    return NextResponse.json(
      { error: 'Failed to create medication' },
      { status: 500 }
    );
  }
}
