import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { memberId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.medicalProfile.findUnique({
      where: { memberId: params.memberId },
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

    // If profile exists, verify it belongs to user's family
    if (profile && profile.member.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // If profile doesn't exist, verify member exists and belongs to family
    if (!profile) {
      const member = await prisma.familyMember.findUnique({
        where: { id: params.memberId },
        select: { familyId: true },
      });

      if (!member || member.familyId !== session.user.familyId) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    console.error('Error fetching medical profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch medical profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { memberId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can update medical profiles
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can update medical profiles' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { bloodType, allergies, conditions, medications, weight, weightUnit } = body;

    // Verify member belongs to family
    const member = await prisma.familyMember.findUnique({
      where: { id: params.memberId },
      select: { id: true, familyId: true },
    });

    if (!member || member.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Validate weight if provided
    if (weight !== undefined && weight !== null && weight < 0) {
      return NextResponse.json(
        { error: 'Weight must be a positive number' },
        { status: 400 }
      );
    }

    // Validate weightUnit if provided
    if (weightUnit !== undefined && weightUnit !== null) {
      if (weightUnit !== 'lbs' && weightUnit !== 'kg') {
        return NextResponse.json(
          { error: 'Weight unit must be either "lbs" or "kg"' },
          { status: 400 }
        );
      }
    }

    // Build update data (only include fields that were provided)
    const updateData: any = {};
    if (bloodType !== undefined) updateData.bloodType = bloodType;
    if (allergies !== undefined) updateData.allergies = allergies;
    if (conditions !== undefined) updateData.conditions = conditions;
    if (medications !== undefined) updateData.medications = medications;
    if (weight !== undefined) updateData.weight = weight;
    if (weightUnit !== undefined) updateData.weightUnit = weightUnit;

    // Upsert medical profile
    const profile = await prisma.medicalProfile.upsert({
      where: { memberId: params.memberId },
      create: {
        memberId: params.memberId,
        ...updateData,
      },
      update: updateData,
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'MEDICAL_PROFILE_UPDATED',
        entityType: 'MedicalProfile',
        entityId: profile.id,
        result: 'SUCCESS',
      },
    });

    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    console.error('Error updating medical profile:', error);
    return NextResponse.json(
      { error: 'Failed to update medical profile' },
      { status: 500 }
    );
  }
}
