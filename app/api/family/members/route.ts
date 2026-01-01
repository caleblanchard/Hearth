import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hash } from 'bcrypt';
import { BCRYPT_ROUNDS } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.familyId || session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, role, birthDate, password, pin, avatarUrl } = body;

    // Validation
    if (!name || !role) {
      return NextResponse.json({ error: 'Name and role are required' }, { status: 400 });
    }

    if (role === 'PARENT') {
      if (!email) {
        return NextResponse.json({ error: 'Email is required for parent accounts' }, { status: 400 });
      }
      if (!password) {
        return NextResponse.json({ error: 'Password is required for parent accounts' }, { status: 400 });
      }
    }

    if (role === 'CHILD' && !pin) {
      return NextResponse.json({ error: 'PIN is required for child accounts' }, { status: 400 });
    }

    // Check if email already exists (for parent accounts)
    if (email) {
      const existingMember = await prisma.familyMember.findUnique({
        where: { email },
      });

      if (existingMember) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
    }

    // Hash password or PIN
    let passwordHash = null;
    let pinHash = null;

    if (role === 'PARENT' && password) {
      passwordHash = await hash(password, BCRYPT_ROUNDS);
    } else if (role === 'CHILD' && pin) {
      pinHash = await hash(pin, BCRYPT_ROUNDS);
    }

    // Create the family member
    const newMember = await prisma.familyMember.create({
      data: {
        familyId: session.user.familyId,
        name,
        email: email || null,
        passwordHash,
        pin: pinHash,
        role,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        avatarUrl: avatarUrl || null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        birthDate: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Initialize balances for children
    if (role === 'CHILD') {
      // Create credit balance
      await prisma.creditBalance.create({
        data: {
          memberId: newMember.id,
          currentBalance: 0,
          lifetimeEarned: 0,
          lifetimeSpent: 0,
        },
      });

      // Create screen time settings and balance
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      await prisma.screenTimeSettings.create({
        data: {
          memberId: newMember.id,
          weeklyAllocationMinutes: 420, // 7 hours default
          resetDay: 'SUNDAY',
          rolloverType: 'NONE',
          isActive: true,
        },
      });

      await prisma.screenTimeBalance.create({
        data: {
          memberId: newMember.id,
          currentBalanceMinutes: 420,
          weekStartDate: weekStart,
        },
      });
    }

    return NextResponse.json({
      message: 'Family member added successfully',
      member: newMember,
    });
  } catch (error) {
    console.error('Error creating family member:', error);
    return NextResponse.json({ error: 'Failed to create family member' }, { status: 500 });
  }
}
