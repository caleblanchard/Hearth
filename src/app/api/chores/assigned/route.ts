import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'
import { getAssignedChoresForMember } from '@/lib/data/dashboard-snapshot'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const authContext = await getAuthContext()

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const chores = await getAssignedChoresForMember(authContext.activeMemberId || null)
    return NextResponse.json({ chores })
  } catch (error) {
    logger.error('Assigned chores API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assigned chores' },
      { status: 500 }
    )
  }
}
