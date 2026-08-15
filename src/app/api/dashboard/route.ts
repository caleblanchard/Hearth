import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import {
  buildDashboardSnapshot,
  type DashboardViewerContext,
} from '@/lib/data/dashboard-snapshot'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

function toViewerContext(
  request: NextRequest,
  authResult: Awaited<ReturnType<typeof authenticateRequest>>
): DashboardViewerContext | null {
  if (!authResult.authenticated) {
    return null
  }

  if (authResult.isGuest) {
    return {
      viewerId: authResult.guest!.sessionToken,
      memberId: null,
      familyId: authResult.guest!.familyId,
      role: 'GUEST',
      access: 'guest',
      guestAccessLevel: authResult.guest!.accessLevel,
    }
  }

  const access =
    request.headers.has('X-Kiosk-Child') || request.headers.has('X-Kiosk-Device')
      ? 'kiosk'
      : 'full'

  const memberId = request.headers.has('X-Kiosk-Device')
    ? null
    : authResult.user!.id

  return {
    viewerId: authResult.user!.id,
    memberId,
    familyId: authResult.user!.familyId,
    role: (authResult.user!.role as DashboardViewerContext['role']) || 'CHILD',
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
