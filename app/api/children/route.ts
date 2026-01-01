import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const children = await prisma.familyMember.findMany({
      where: {
        role: 'CHILD',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(children);
  } catch (error) {
    console.error('Children API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch children' },
      { status: 500 }
    );
  }
}
