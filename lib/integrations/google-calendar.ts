/**
 * Google Calendar API Client
 *
 * Handles OAuth authentication and calendar operations with Google Calendar API.
 * Supports incremental sync using sync tokens, automatic token refresh,
 * and bidirectional event synchronization.
 */

import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { createClient } from '@/lib/supabase/server';
import { encryptToken, decryptToken } from '@/lib/token-encryption';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

interface CalendarEvent {
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string | null;
  isAllDay: boolean;
}

interface ImportedEvent {
  googleEventId: string;
  title?: string;
  startTime?: Date;
  endTime?: Date;
  description?: string | null;
  isAllDay?: boolean;
  status?: string;
}

interface ImportResult {
  items: ImportedEvent[];
  nextSyncToken: string | null | undefined;
}

interface TokenResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

interface ExportResult {
  googleEventId: string;
  htmlLink?: string;
}

export class GoogleCalendarClient {
  private oauth2Client: OAuth2Client;

  constructor() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/calendar/google/callback`;

    if (!clientId) {
      throw new Error('GOOGLE_CLIENT_ID must be set');
    }

    if (!clientSecret) {
      throw new Error('GOOGLE_CLIENT_SECRET must be set');
    }

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  /**
   * Generate OAuth authorization URL
   *
   * @param state - CSRF protection state token
   * @returns Authorization URL for user to visit
   */
  getAuthUrl(state: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: state,
      prompt: 'consent', // Force consent to ensure refresh token is returned
    });
  }

  /**
   * Exchange authorization code for access and refresh tokens
   *
   * @param code - Authorization code from OAuth callback
   * @returns Token information
   * @throws Error if no refresh token returned
   */
  async getTokensFromCode(code: string): Promise<TokenResult> {
    const { tokens } = await this.oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      throw new Error('No refresh token returned from Google');
    }

    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(tokens.expiry_date!),
    };
  }

  /**
   * Refresh expired access token using refresh token
   *
   * @param connectionId - Calendar connection ID
   * @throws Error if connection not found or token refresh fails
   */
  async refreshAccessToken(connectionId: string): Promise<void> {
    const supabase = await createClient();
    
    const { data: connection } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection) {
      throw new Error('Calendar connection not found');
    }

    try {
      const refreshToken = decryptToken(connection.refreshToken);

      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      // Update connection with new access token
      await supabase
        .from('calendar_connections')
        .update({
          access_token: encryptToken(credentials.access_token!),
          token_expires_at: new Date(credentials.expiry_date!).toISOString(),
        })
        .eq('id', connectionId);
    } catch (error) {
      // Mark connection as error if refresh fails
      await supabase
        .from('calendar_connections')
        .update({
          sync_status: 'ERROR',
          sync_error: `Token refresh failed: ${(error as Error).message}`,
        })
        .eq('id', connectionId);

      throw error;
    }
  }

  /**
   * Get authenticated Google Calendar API instance
   *
   * @param connectionId - Calendar connection ID
   * @returns Authenticated calendar API instance
   */
  async getCalendar(connectionId: string): Promise<calendar_v3.Calendar> {
    const supabase = await createClient();
    
    const { data: connection } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection) {
      throw new Error('Calendar connection not found');
    }

    // Check if token is expired and refresh if needed
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      await this.refreshAccessToken(connectionId);

      // Reload connection to get new token
      const supabase = await createClient();
      const { data: refreshedConnection } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (!refreshedConnection) {
        throw new Error('Calendar connection not found after refresh');
      }

      const accessToken = decryptToken(refreshedConnection.access_token);
      this.oauth2Client.setCredentials({
        access_token: accessToken,
      });
    } else {
      const accessToken = decryptToken(connection.access_token);
      this.oauth2Client.setCredentials({
        access_token: accessToken,
      });
    }

    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Import events from Google Calendar using incremental sync
   *
   * @param connectionId - Calendar connection ID
   * @returns Imported events and new sync token
   */
  async importEvents(connectionId: string): Promise<ImportResult> {
    const supabase = await createClient();
    
    const { data: connection } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection) {
      throw new Error('Calendar connection not found');
    }

    const calendar = await this.getCalendar(connectionId);
    const calendarId = connection.googleCalendarId || 'primary';

    try {
      let response;

      if (connection.syncToken) {
        // Incremental sync using sync token
        response = await calendar.events.list({
          calendarId: calendarId,
          syncToken: connection.syncToken,
          singleEvents: true,
        });
      } else {
        // Full sync - fetch events from 30 days ago
        const timeMin = new Date();
        timeMin.setDate(timeMin.getDate() - 30);

        response = await calendar.events.list({
          calendarId: calendarId,
          timeMin: timeMin.toISOString(),
          maxResults: 250,
          singleEvents: true,
          orderBy: 'startTime',
        });
      }

      const items = (response.data.items || []).map((event) => {
        // Handle cancelled events
        if (event.status === 'cancelled') {
          return {
            googleEventId: event.id!,
            status: 'cancelled',
          };
        }

        // Parse event times
        const isAllDay = !!(event.start?.date && !event.start?.dateTime);
        const startTime = isAllDay
          ? new Date(event.start!.date!)
          : new Date(event.start!.dateTime!);
        const endTime = isAllDay ? new Date(event.end!.date!) : new Date(event.end!.dateTime!);

        return {
          googleEventId: event.id!,
          title: event.summary || 'Untitled Event',
          startTime,
          endTime,
          description: event.description || null,
          isAllDay,
        };
      });

      return {
        items,
        nextSyncToken: response.data.nextSyncToken,
      };
    } catch (error: any) {
      // Handle sync token invalidation (410 Gone)
      if (error.code === 410) {
        // Reset sync token and do full sync
        await supabase
          .from('calendar_connections')
          .update({ sync_token: null })
          .eq('id', connectionId);

        // Retry with full sync
        return this.importEvents(connectionId);
      }

      throw error;
    }
  }

  /**
   * Create new event in Google Calendar
   *
   * @param connectionId - Calendar connection ID
   * @param event - Event data to create
   * @returns Created event ID and link
   */
  async exportEvent(connectionId: string, event: CalendarEvent): Promise<ExportResult> {
    const supabase = await createClient();
    
    const { data: connection } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection) {
      throw new Error('Calendar connection not found');
    }

    const calendar = await this.getCalendar(connectionId);
    const calendarId = connection.googleCalendarId || 'primary';

    const requestBody: calendar_v3.Schema$Event = {
      summary: event.title,
    };

    // Add description if provided
    if (event.description) {
      requestBody.description = event.description;
    }

    // Set start and end times
    if (event.isAllDay) {
      requestBody.start = {
        date: event.startTime.toISOString().split('T')[0],
      };
      requestBody.end = {
        date: event.endTime.toISOString().split('T')[0],
      };
    } else {
      requestBody.start = {
        dateTime: event.startTime.toISOString(),
        timeZone: 'UTC',
      };
      requestBody.end = {
        dateTime: event.endTime.toISOString(),
        timeZone: 'UTC',
      };
    }

    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: requestBody,
    });

    return {
      googleEventId: response.data.id!,
      htmlLink: response.data.htmlLink || undefined,
    };
  }

  /**
   * Update existing event in Google Calendar
   *
   * @param connectionId - Calendar connection ID
   * @param googleEventId - Google event ID to update
   * @param event - Updated event data
   */
  async updateEvent(
    connectionId: string,
    googleEventId: string,
    event: CalendarEvent
  ): Promise<void> {
    const supabase = await createClient();
    
    const { data: connection } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection) {
      throw new Error('Calendar connection not found');
    }

    const calendar = await this.getCalendar(connectionId);
    const calendarId = connection.googleCalendarId || 'primary';

    const requestBody: calendar_v3.Schema$Event = {
      summary: event.title,
    };

    // Add description if provided
    if (event.description) {
      requestBody.description = event.description;
    }

    // Set start and end times
    if (event.isAllDay) {
      requestBody.start = {
        date: event.startTime.toISOString().split('T')[0],
      };
      requestBody.end = {
        date: event.endTime.toISOString().split('T')[0],
      };
    } else {
      requestBody.start = {
        dateTime: event.startTime.toISOString(),
        timeZone: 'UTC',
      };
      requestBody.end = {
        dateTime: event.endTime.toISOString(),
        timeZone: 'UTC',
      };
    }

    await calendar.events.update({
      calendarId: calendarId,
      eventId: googleEventId,
      requestBody: requestBody,
    });
  }

  /**
   * Delete event from Google Calendar
   *
   * @param connectionId - Calendar connection ID
   * @param googleEventId - Google event ID to delete
   */
  async deleteEvent(connectionId: string, googleEventId: string): Promise<void> {
    const supabase = await createClient();
    
    const { data: connection } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection) {
      throw new Error('Calendar connection not found');
    }

    const calendar = await this.getCalendar(connectionId);
    const calendarId = connection.googleCalendarId || 'primary';

    try {
      await calendar.events.delete({
        calendarId: calendarId,
        eventId: googleEventId,
      });
    } catch (error: any) {
      // Treat 404 as success (event already deleted)
      if (error.code === 404) {
        return;
      }

      throw error;
    }
  }

  /**
   * Get Google account email address
   *
   * @param connectionId - Calendar connection ID
   * @returns User's email address
   */
  async getUserEmail(connectionId: string): Promise<string> {
    const supabase = await createClient();
    
    const { data: connection } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection) {
      throw new Error('Calendar connection not found');
    }

    const accessToken = decryptToken(connection.accessToken);

    this.oauth2Client.setCredentials({
      access_token: accessToken,
    });

    const tokenInfo = await this.oauth2Client.getTokenInfo(accessToken);

    return tokenInfo.email!;
  }
}
