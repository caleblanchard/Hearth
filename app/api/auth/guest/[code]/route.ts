import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

// Generate a secure session token
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Find invite by code
    const { data: invite } = await supabase
      .from('guest_invites')
      .select('*')
      .eq('invite_code', code)
      .single();

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    // Check if invite is expired
    if (new Date() > new Date(invite.expires_at)) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 400 });
    }

    // Check if invite is revoked
    if (invite.status === 'REVOKED') {
      return NextResponse.json({ error: 'Invite has been revoked' }, { status: 400 });
    }

    // Check if max uses exceeded
    if (invite.use_count >= invite.max_uses) {
      return NextResponse.json(
        { error: 'Invite has reached maximum uses' },
        { status: 400 }
      );
    }

    // Get IP address and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const now = new Date();

    // Generate session token
    const sessionToken = generateSessionToken();

    // Create guest session
    const { data: session } = await supabase
      .from('guest_sessions')
      .insert({
        guest_invite_id: invite.id,
        session_token: sessionToken,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: invite.expires_at, // Session expires when invite expires
      })
      .select()
      .single();

    // Update invite: increment use count, set status to ACTIVE, update last accessed
    await supabase
      .from('guest_invites')
      .update({
        status: 'ACTIVE',
        use_count: invite.use_count + 1,
        last_accessed_at: now.toISOString(),
      })
      .eq('id', invite.id);

    // Create audit log
    await supabase
      .from('audit_logs')
      .insert({
        family_id: invite.family_id,
        member_id: null, // Guest is not a family member
        action: 'GUEST_SESSION_STARTED',
        result: 'SUCCESS',
        details: {
          inviteId: invite.id,
          guestName: invite.guest_name,
          accessLevel: invite.access_level,
        },
      });

    return NextResponse.json({
      session,
      invite: {
        id: invite.id,
        guestName: invite.guest_name,
        accessLevel: invite.access_level,
        expiresAt: invite.expires_at,
      },
      message: 'Guest session started successfully',
    });
  } catch (error) {
    logger.error('Error starting guest session:', error);
    return NextResponse.json(
      { error: 'Failed to start guest session' },
      { status: 500 }
    );
  }
}
