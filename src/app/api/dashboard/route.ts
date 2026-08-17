import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import {
  buildDashboardSnapshot,
  type DashboardViewerContext,
} from '@/lib/data/dashboard-snapshot'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export function toViewerContext(
  request: NextRequest,
  authResult: Awaited<ReturnType<typeof authenticateRequest>>
): DashboardViewerContext | null {
  if (!authResult.authenticated) {
    return null
  }

  if (authResult.isGuest) {
    const guest = authResult.guest
    if (!guest) {
      return null
    }
    return {
      viewerId: guest.sessionToken,
      memberId: null,
      familyId: guest.familyId,
      role: 'GUEST',
      access: 'guest',
      guestAccessLevel: guest.accessLevel,
    }
  }

  const user = authResult.user
  if (!user) {
    return null
  }

  const access =
    request.headers.has('X-Kiosk-Child') || request.headers.has('X-Kiosk-Device')
      ? 'kiosk'
      : 'full'

  const memberId = request.headers.has('X-Kiosk-Device') ? null : user.id

  return {
    viewerId: user.id,
    memberId,
    familyId: user.familyId,
    role: (user.role as DashboardViewerContext['role']) || 'CHILD',
    access,
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)

    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const viewer = toViewerContext(request, authResult)
    if (!viewer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const snapshot = await buildDashboardSnapshot(viewer)
    return NextResponse.json(snapshot)
  } catch (error) {
    logger.error('Dashboard Snapshot API error', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
