import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    const where: any = {
      member: {
        familyId: session.user.familyId,
      },
    };

    if (memberId) {
      where.memberId = memberId;
    }

    const medications = await prisma.medicationSafety.findMany({
      where,
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
  } catch (error) {
    console.error('Error fetching medications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch medications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can create medication safety configs
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can create medication safety configurations' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      memberId,
      medicationName,
      activeIngredient,
      minIntervalHours,
      maxDosesPerDay,
      notifyWhenReady,
    } = body;

    if (!memberId || !medicationName || !minIntervalHours) {
      return NextResponse.json(
        { error: 'Member ID, medication name, and minimum interval are required' },
        { status: 400 }
      );
    }

    // Verify member belongs to family
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      select: { id: true, familyId: true },
    });

    if (!member || member.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'Member not found or does not belong to your family' },
        { status: 400 }
      );
    }

    const medication = await prisma.medicationSafety.create({
      data: {
        memberId,
        medicationName: medicationName.trim(),
        activeIngredient: activeIngredient?.trim() || null,
        minIntervalHours,
        maxDosesPerDay: maxDosesPerDay || null,
        notifyWhenReady: notifyWhenReady !== undefined ? notifyWhenReady : true,
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'MEDICATION_SAFETY_CREATED',
        result: 'SUCCESS',
        metadata: {
          medicationId: medication.id,
          medicationName: medication.medicationName,
          memberName: medication.member.name,
        },
      },
    });

    return NextResponse.json(
      { medication, message: 'Medication safety configuration created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating medication safety:', error);
    return NextResponse.json(
      { error: 'Failed to create medication safety configuration' },
      { status: 500 }
    );
  }
}
