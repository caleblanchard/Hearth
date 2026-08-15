import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'
import { getCreditBalance } from '@/lib/data/credits'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const authContext = await getAuthContext()

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const memberId = authContext.activeMemberId
    if (!memberId) {
      return NextResponse.json({ error: 'No member found' }, { status: 400 })
    }

    const balance = await getCreditBalance(memberId)

    return NextResponse.json({
      balance: {
        current: balance.current_balance,
        lifetimeEarned: balance.lifetime_earned,
        lifetimeSpent: balance.lifetime_spent,
      },
    })
  } catch (error) {
    logger.error('Credit balance API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credit balance' },
      { status: 500 }
    )
  }
}
