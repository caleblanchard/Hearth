/**
 * Google Calendar OAuth Callback
 *
 * GET /api/calendar/google/callback
 * Handles OAuth callback, exchanges code for tokens, and creates/updates calendar connection
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GoogleCalendarClient } from '@/lib/integrations/google-calendar';
import { encryptToken } from '@/lib/token-encryption';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const settingsUrl = '/dashboard/settings/calendars';

  try {
    // Check authentication
    const session = await auth();

    if (!session || !session.user) {
      // Redirect to sign in if not authenticated
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    // Validate parameters
    if (!state) {
      logger.warn('OAuth callback missing state parameter', { userId: session.user.id });
      return NextResponse.redirect(
        new URL(`${settingsUrl}?error=missing_state`, request.url)
      );
    }

    if (!code) {
      logger.warn('OAuth callback missing code parameter', { userId: session.user.id });
      return NextResponse.redirect(
        new URL(`${settingsUrl}?error=missing_code`, request.url)
      );
    }

    // Verify state matches cookie (CSRF protection)
    const stateCookie = request.cookies.get('google_oauth_state');

    if (!stateCookie || stateCookie.value !== state) {
      logger.warn('OAuth callback state mismatch', {
        userId: session.user.id,
        receivedState: state,
        cookieState: stateCookie?.value,
      });
      return NextResponse.redirect(
        new URL(`${settingsUrl}?error=invalid_state`, request.url)
      );
    }

    // Get family member info
    // session.user.id is the FamilyMember ID from the auth system
    const familyMember = await prisma.familyMember.findUnique({
      where: {
        id: session.user.id,
      },
    });

    if (!familyMember) {
      logger.error('Family member not found for user', { userId: session.user.id });
      return NextResponse.redirect(
        new URL(`${settingsUrl}?error=member_not_found`, request.url)
      );
    }

    // Create Google Calendar client
    const client = new GoogleCalendarClient();

    // Exchange authorization code for tokens
    let tokens;
    try {
      tokens = await client.getTokensFromCode(code);
    } catch (error) {
      logger.error('Failed to exchange authorization code for tokens', {
        error,
        userId: session.user.id,
      });
      return NextResponse.redirect(
        new URL(`${settingsUrl}?error=token_exchange_failed`, request.url)
      );
    }

    // Encrypt tokens for storage
    const encryptedAccessToken = encryptToken(tokens.accessToken);
    const encryptedRefreshToken = encryptToken(tokens.refreshToken);

    // Create temporary connection to get user email
    const tempConnection = await prisma.calendarConnection.create({
      data: {
        memberId: familyMember.id,
        familyId: familyMember.familyId,
        provider: 'GOOGLE',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiresAt,
        syncStatus: 'ACTIVE',
      },
    });

    // Get user's Google email
    let googleEmail: string;
    try {
      googleEmail = await client.getUserEmail(tempConnection.id);
    } catch (error) {
      logger.error('Failed to get Google user email', { error, userId: session.user.id });
      // Delete temporary connection
      await prisma.calendarConnection.delete({
        where: { id: tempConnection.id },
      });
      return NextResponse.redirect(
        new URL(`${settingsUrl}?error=email_fetch_failed`, request.url)
      );
    }

    // Delete temporary connection
    await prisma.calendarConnection.delete({
      where: { id: tempConnection.id },
    });

    // Check if connection already exists for this member
    const existingConnection = await prisma.calendarConnection.findUnique({
      where: {
        memberId_provider: {
          memberId: familyMember.id,
          provider: 'GOOGLE',
        },
      },
    });

    if (existingConnection) {
      // Update existing connection
      await prisma.calendarConnection.update({
        where: { id: existingConnection.id },
        data: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: tokens.expiresAt,
          googleEmail: googleEmail,
          syncEnabled: true,
          syncStatus: 'ACTIVE',
          syncError: null,
          nextSyncAt: new Date(), // Trigger immediate sync
        },
      });

      logger.info('Google Calendar connection updated', {
        userId: session.user.id,
        connectionId: existingConnection.id,
        googleEmail,
      });
    } else {
      // Create new connection
      await prisma.calendarConnection.create({
        data: {
          memberId: familyMember.id,
          familyId: familyMember.familyId,
          provider: 'GOOGLE',
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: tokens.expiresAt,
          googleEmail: googleEmail,
          googleCalendarId: 'primary',
          syncEnabled: true,
          importFromGoogle: true,
          exportToGoogle: true,
          syncStatus: 'ACTIVE',
          nextSyncAt: new Date(), // Trigger immediate sync
        },
      });

      logger.info('Google Calendar connection created', {
        userId: session.user.id,
        googleEmail,
      });
    }

    // Create response with success redirect
    const response = NextResponse.redirect(
      new URL(`${settingsUrl}?success=true`, request.url)
    );

    // Clear state cookie
    response.cookies.set('google_oauth_state', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/api/calendar/google',
    });

    return response;
  } catch (error) {
    logger.error('OAuth callback error', { error });

    return NextResponse.redirect(
      new URL(`${settingsUrl}?error=unknown`, request.url)
    );
  }
}
