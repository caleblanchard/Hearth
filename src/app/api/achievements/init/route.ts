import { NextResponse } from 'next/server';
import { initializeAchievements } from '@/lib/achievements';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    await initializeAchievements();
    return NextResponse.json({ success: true, message: 'Achievements initialized' });
  } catch (error) {
    logger.error('Achievement initialization error:', error);
    return NextResponse.json({ error: 'Failed to initialize achievements' }, { status: 500 });
  }
}
