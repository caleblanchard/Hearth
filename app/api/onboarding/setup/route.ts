import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hash } from 'bcrypt';
import { Role } from '@/app/generated/prisma';

/**
 * POST /api/onboarding/setup
 *
 * Complete initial system onboarding by creating:
 * 1. Family record
 * 2. First admin/parent user
 * 3. Mark system as onboarded
 *
 * This endpoint is public (no authentication required) but can only
 * be called once during initial setup.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { familyName, timezone, adminName, adminEmail, adminPassword } = body;

    // Check if onboarding is already complete
    const existingConfig = await prisma.systemConfig.findUnique({
      where: { id: 'system' },
    });

    if (existingConfig?.onboardingComplete) {
      return NextResponse.json(
        { error: 'Onboarding already complete' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!familyName || !familyName.trim()) {
      return NextResponse.json(
        { error: 'Family name is required' },
        { status: 400 }
      );
    }

    if (!adminName || !adminName.trim()) {
      return NextResponse.json(
        { error: 'Admin name is required' },
        { status: 400 }
      );
    }

    if (!adminEmail || !adminEmail.trim()) {
      return NextResponse.json(
        { error: 'Admin email is required' },
        { status: 400 }
      );
    }

    if (!adminPassword || !adminPassword.trim()) {
      return NextResponse.json(
        { error: 'Admin password is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength (minimum 8 characters)
    if (adminPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create family
      const family = await tx.family.create({
        data: {
          name: familyName.trim(),
          timezone: timezone || 'America/New_York',
        },
      });

      // Hash password
      const passwordHash = await hash(adminPassword, 10);

      // Create admin user
      const admin = await tx.familyMember.create({
        data: {
          familyId: family.id,
          name: adminName.trim(),
          email: adminEmail.trim().toLowerCase(),
          passwordHash,
          role: Role.PARENT,
          isActive: true,
        },
      });

      // Mark onboarding as complete
      const systemConfig = await tx.systemConfig.upsert({
        where: { id: 'system' },
        create: {
          id: 'system',
          onboardingComplete: true,
          setupCompletedAt: new Date(),
          setupCompletedBy: admin.id,
        },
        update: {
          onboardingComplete: true,
          setupCompletedAt: new Date(),
          setupCompletedBy: admin.id,
        },
      });

      return { family, admin, systemConfig };
    });

    return NextResponse.json({
      success: true,
      family: {
        id: result.family.id,
        name: result.family.name,
        timezone: result.family.timezone,
      },
      admin: {
        id: result.admin.id,
        name: result.admin.name,
        email: result.admin.email,
        role: result.admin.role,
      },
    });
  } catch (error: any) {
    console.error('Error completing onboarding:', error);

    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      if (target && target.includes('email')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}
