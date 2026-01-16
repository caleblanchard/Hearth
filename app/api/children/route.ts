import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: children } = await supabase
      .from('family_members')
      .select('id, name, avatar_url')
      .eq('role', 'CHILD')
      .eq('is_active', true)
      .order('name', { ascending: true });

    return NextResponse.json(children || []);
  } catch (error) {
    logger.error('Children API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch children' },
      { status: 500 }
    );
  }
}
