import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getGuestInvites } from '@/lib/data/guests';
import { logger } from '@/lib/logger';

const normalizeSession = (session: any) => ({
  ...session,
  endedAt: session.ended_at ?? session.endedAt ?? null,
  startedAt: session.started_at ?? session.startedAt,
  createdAt: session.created_at ?? session.createdAt,
});

const normalizeInvite = (invite: any) => ({
  ...invite,
  guestName: invite.guest_name ?? invite.guestName ?? null,
  guestEmail: invite.guest_email ?? invite.guestEmail ?? null,
  accessLevel: invite.access_level ?? invite.accessLevel,
  inviteCode: invite.invite_code ?? invite.inviteCode,
  useCount: invite.use_count ?? invite.useCount ?? 0,
  maxUses: invite.max_uses ?? invite.maxUses ?? 1,
  expiresAt: invite.expires_at ?? invite.expiresAt ?? null,
  lastAccessedAt: invite.last_accessed_at ?? invite.lastAccessedAt ?? null,
  createdAt: invite.created_at ?? invite.createdAt,
  familyId: invite.family_id ?? invite.familyId,
  invitedBy: invite.invited_by ?? invite.invitedBy,
  sessions: invite.sessions ? invite.sessions.map(normalizeSession) : [],
});

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can view guest invites
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can view guest invites' },
        { status: 403 }
      );
    }

    const invites = await getGuestInvites(familyId);

    return NextResponse.json({ invites: invites.map(normalizeInvite) });
  } catch (error) {
    logger.error('Get guest invites error:', error);
    return NextResponse.json({ error: 'Failed to get guest invites' }, { status: 500 });
  }
}
