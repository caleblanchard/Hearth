import { NextRequest, NextResponse } from 'next/server'
import { registerFamily } from '@/lib/auth/signup'
import { logger } from '@/lib/logger'

/**
 * POST /api/auth/signup
 * Register a new family with initial parent account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await registerFamily(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to register family' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      familyId: result.familyId,
      memberId: result.memberId,
      userId: result.userId,
      family: result.family,
      member: result.member,
    })
  } catch (error) {
    logger.error('Signup API error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
