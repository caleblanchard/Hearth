// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock other dependencies
jest.mock('googleapis');
jest.mock('@/lib/token-encryption');

// NOW import modules after mocks are set up
import { GoogleCalendarClient } from '@/lib/integrations/google-calendar';
import { google } from 'googleapis';
import { encryptToken, decryptToken } from '@/lib/token-encryption';

// Mock environment variables
const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.resetModules();
  resetPrismaMock();
  process.env = {
    ...ORIGINAL_ENV,
    GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    NEXTAUTH_URL: 'http://localhost:3001',
  };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  jest.clearAllMocks();
});

describe('GoogleCalendarClient', () => {
  describe('Configuration', () => {
    it('should throw error if GOOGLE_CLIENT_ID is not set', () => {
      delete process.env.GOOGLE_CLIENT_ID;
      expect(() => new GoogleCalendarClient()).toThrow('GOOGLE_CLIENT_ID must be set');
    });

    it('should throw error if GOOGLE_CLIENT_SECRET is not set', () => {
      delete process.env.GOOGLE_CLIENT_SECRET;
      expect(() => new GoogleCalendarClient()).toThrow('GOOGLE_CLIENT_SECRET must be set');
    });

    it('should initialize OAuth2 client with correct configuration', () => {
      const mockOAuth2 = jest.fn();
      (google.auth.OAuth2 as jest.Mock) = mockOAuth2;

      new GoogleCalendarClient();

      expect(mockOAuth2).toHaveBeenCalledWith(
        'test-client-id.apps.googleusercontent.com',
        'test-client-secret',
        'http://localhost:3001/api/calendar/google/callback'
      );
    });
  });

  describe('getAuthUrl', () => {
    it('should generate OAuth URL with correct scopes', () => {
      const mockGenerateAuthUrl = jest.fn().mockReturnValue('https://accounts.google.com/oauth');
      const mockOAuth2Client = {
        generateAuthUrl: mockGenerateAuthUrl,
      };

      (google.auth.OAuth2 as jest.Mock) = jest.fn(() => mockOAuth2Client);

      const client = new GoogleCalendarClient();
      const authUrl = client.getAuthUrl('test-state-token');

      expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/calendar.events',
          'https://www.googleapis.com/auth/calendar.readonly',
          'https://www.googleapis.com/auth/userinfo.email',
        ],
        state: 'test-state-token',
        prompt: 'consent', // Force to get refresh token
      });

      expect(authUrl).toBe('https://accounts.google.com/oauth');
    });
  });

  describe('getTokensFromCode', () => {
    it('should exchange authorization code for tokens', async () => {
      const mockGetToken = jest.fn().mockResolvedValue({
        tokens: {
          access_token: 'access-token-123',
          refresh_token: 'refresh-token-456',
          expiry_date: Date.now() + 3600000, // 1 hour from now
        },
      });

      const mockOAuth2Client = {
        getToken: mockGetToken,
      };

      (google.auth.OAuth2 as jest.Mock) = jest.fn(() => mockOAuth2Client);

      const client = new GoogleCalendarClient();
      const tokens = await client.getTokensFromCode('auth-code-xyz');

      expect(mockGetToken).toHaveBeenCalledWith('auth-code-xyz');
      expect(tokens).toEqual({
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        expiresAt: expect.any(Date),
      });
    });

    it('should throw error if no refresh token returned', async () => {
      const mockGetToken = jest.fn().mockResolvedValue({
        tokens: {
          access_token: 'access-token-123',
          // No refresh_token
          expiry_date: Date.now() + 3600000,
        },
      });

      const mockOAuth2Client = {
        getToken: mockGetToken,
      };

      (google.auth.OAuth2 as jest.Mock) = jest.fn(() => mockOAuth2Client);

      const client = new GoogleCalendarClient();

      await expect(client.getTokensFromCode('auth-code-xyz')).rejects.toThrow(
        'No refresh token returned'
      );
    });

    it('should handle token exchange errors', async () => {
      const mockGetToken = jest.fn().mockRejectedValue(new Error('Invalid authorization code'));

      const mockOAuth2Client = {
        getToken: mockGetToken,
      };

      (google.auth.OAuth2 as jest.Mock) = jest.fn(() => mockOAuth2Client);

      const client = new GoogleCalendarClient();

      await expect(client.getTokensFromCode('invalid-code')).rejects.toThrow(
        'Invalid authorization code'
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh expired access token using refresh token', async () => {
      const connectionId = 'connection-123';
      const oldAccessToken = 'old-access-token';
      const newAccessToken = 'new-access-token';
      const encryptedRefreshToken = 'encrypted:refresh:token';
      const decryptedRefreshToken = 'refresh-token-456';
      const newExpiryDate = Date.now() + 3600000;

      (decryptToken as jest.Mock).mockReturnValue(decryptedRefreshToken);
      (encryptToken as jest.Mock).mockReturnValue('encrypted:new:access');

      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        id: connectionId,
        accessToken: oldAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: new Date(Date.now() - 1000), // Expired
      } as any);

      const mockRefreshAccessToken = jest.fn().mockResolvedValue({
        credentials: {
          access_token: newAccessToken,
          expiry_date: newExpiryDate,
        },
      });

      const mockSetCredentials = jest.fn();

      const mockOAuth2Client = {
        setCredentials: mockSetCredentials,
        refreshAccessToken: mockRefreshAccessToken,
      };

      (google.auth.OAuth2 as jest.Mock) = jest.fn(() => mockOAuth2Client);

      prismaMock.calendarConnection.update.mockResolvedValue({} as any);

      const client = new GoogleCalendarClient();
      await client.refreshAccessToken(connectionId);

      expect(prismaMock.calendarConnection.findUnique).toHaveBeenCalledWith({
        where: { id: connectionId },
      });

      expect(decryptToken).toHaveBeenCalledWith(encryptedRefreshToken);

      expect(mockSetCredentials).toHaveBeenCalledWith({
        refresh_token: decryptedRefreshToken,
      });

      expect(mockRefreshAccessToken).toHaveBeenCalled();

      expect(prismaMock.calendarConnection.update).toHaveBeenCalledWith({
        where: { id: connectionId },
        data: {
          accessToken: 'encrypted:new:access',
          tokenExpiresAt: new Date(newExpiryDate),
        },
      });
    });

    it('should throw error if connection not found', async () => {
      prismaMock.calendarConnection.findUnique.mockResolvedValue(null);

      const client = new GoogleCalendarClient();

      await expect(client.refreshAccessToken('non-existent-id')).rejects.toThrow(
        'Calendar connection not found'
      );
    });

    it('should handle refresh token errors and mark connection as error', async () => {
      const connectionId = 'connection-123';

      (decryptToken as jest.Mock).mockReturnValue('refresh-token-456');

      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        id: connectionId,
        refreshToken: 'encrypted:refresh:token',
      } as any);

      const mockRefreshAccessToken = jest.fn().mockRejectedValue(
        new Error('Invalid refresh token')
      );

      const mockSetCredentials = jest.fn();

      const mockOAuth2Client = {
        setCredentials: mockSetCredentials,
        refreshAccessToken: mockRefreshAccessToken,
      };

      (google.auth.OAuth2 as jest.Mock) = jest.fn(() => mockOAuth2Client);

      prismaMock.calendarConnection.update.mockResolvedValue({} as any);

      const client = new GoogleCalendarClient();

      await expect(client.refreshAccessToken(connectionId)).rejects.toThrow(
        'Invalid refresh token'
      );

      expect(prismaMock.calendarConnection.update).toHaveBeenCalledWith({
        where: { id: connectionId },
        data: {
          syncStatus: 'ERROR',
          syncError: 'Token refresh failed: Invalid refresh token',
        },
      });
    });
  });

  describe('getCalendar', () => {
    it('should return authenticated calendar instance', async () => {
      const connectionId = 'connection-123';
      const encryptedAccessToken = 'encrypted:access:token';
      const decryptedAccessToken = 'access-token-123';

      (decryptToken as jest.Mock).mockReturnValue(decryptedAccessToken);

      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        id: connectionId,
        accessToken: encryptedAccessToken,
        tokenExpiresAt: new Date(Date.now() + 3600000), // Not expired
      } as any);

      const mockSetCredentials = jest.fn();
      const mockCalendar = { events: {} };

      const mockOAuth2Client = {
        setCredentials: mockSetCredentials,
      };

      (google.auth.OAuth2 as jest.Mock) = jest.fn(() => mockOAuth2Client);
      (google.calendar as jest.Mock) = jest.fn(() => mockCalendar);

      const client = new GoogleCalendarClient();
      const calendar = await client.getCalendar(connectionId);

      expect(decryptToken).toHaveBeenCalledWith(encryptedAccessToken);

      expect(mockSetCredentials).toHaveBeenCalledWith({
        access_token: decryptedAccessToken,
      });

      expect(google.calendar).toHaveBeenCalledWith({
        version: 'v3',
        auth: mockOAuth2Client,
      });

      expect(calendar).toBe(mockCalendar);
    });

    it('should refresh token if expired before returning calendar', async () => {
      const connectionId = 'connection-123';
      const encryptedAccessToken = 'encrypted:access:token';
      const encryptedRefreshToken = 'encrypted:refresh:token';
      const decryptedRefreshToken = 'refresh-token-456';
      const newAccessToken = 'new-access-token';

      (decryptToken as jest.Mock).mockReturnValue(decryptedRefreshToken);
      (encryptToken as jest.Mock).mockReturnValue('encrypted:new:access');

      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        id: connectionId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: new Date(Date.now() - 1000), // Expired
      } as any);

      const mockRefreshAccessToken = jest.fn().mockResolvedValue({
        credentials: {
          access_token: newAccessToken,
          expiry_date: Date.now() + 3600000,
        },
      });

      const mockSetCredentials = jest.fn();
      const mockCalendar = { events: {} };

      const mockOAuth2Client = {
        setCredentials: mockSetCredentials,
        refreshAccessToken: mockRefreshAccessToken,
      };

      (google.auth.OAuth2 as jest.Mock) = jest.fn(() => mockOAuth2Client);
      (google.calendar as jest.Mock) = jest.fn(() => mockCalendar);

      prismaMock.calendarConnection.update.mockResolvedValue({
        accessToken: 'encrypted:new:access',
      } as any);

      const client = new GoogleCalendarClient();
      const calendar = await client.getCalendar(connectionId);

      expect(mockRefreshAccessToken).toHaveBeenCalled();
      expect(calendar).toBe(mockCalendar);
    });
  });

  describe('importEvents', () => {
    it('should import events using sync token for incremental sync', async () => {
      const connectionId = 'connection-123';
      const syncToken = 'sync-token-abc';

      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        id: connectionId,
        googleCalendarId: 'primary',
        syncToken: syncToken,
        accessToken: 'encrypted:access:token',
        tokenExpiresAt: new Date(Date.now() + 3600000),
      } as any);

      (decryptToken as jest.Mock).mockReturnValue('access-token-123');

      const mockEventsList = jest.fn().mockResolvedValue({
        data: {
          items: [
            {
              id: 'google-event-1',
              summary: 'Team Meeting',
              start: { dateTime: '2026-01-05T10:00:00Z' },
              end: { dateTime: '2026-01-05T11:00:00Z' },
              description: 'Discuss Q1 goals',
            },
            {
              id: 'google-event-2',
              summary: 'Lunch',
              start: { date: '2026-01-05' }, // All-day event
              end: { date: '2026-01-05' },
            },
          ],
          nextSyncToken: 'new-sync-token-xyz',
        },
      });

      const mockCalendar = {
        events: {
          list: mockEventsList,
        },
      };

      const mockOAuth2Client = {
        setCredentials: jest.fn(),
      };

      (google.auth.OAuth2 as jest.Mock) = jest.fn(() => mockOAuth2Client);
      (google.calendar as jest.Mock) = jest.fn(() => mockCalendar);

      const client = new GoogleCalendarClient();
      const events = await client.importEvents(connectionId);

      expect(mockEventsList).toHaveBeenCalledWith({
        calendarId: 'primary',
        syncToken: syncToken,
        singleEvents: true,
      });

      expect(events).toEqual({
        items: [
          {
            googleEventId: 'google-event-1',
            title: 'Team Meeting',
            startTime: new Date('2026-01-05T10:00:00Z'),
            endTime: new Date('2026-01-05T11:00:00Z'),
            description: 'Discuss Q1 goals',
            isAllDay: false,
          },
          {
            googleEventId: 'google-event-2',
            title: 'Lunch',
            startTime: expect.any(Date),
            endTime: expect.any(Date),
            description: null,
            isAllDay: true,
          },
        ],
        nextSyncToken: 'new-sync-token-xyz',
      });
    });

    it('should handle full sync if no sync token exists', async () => {
      const connectionId = 'connection-123';

      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        id: connectionId,
        googleCalendarId: 'primary',
        syncToken: null, // No sync token - full sync
        accessToken: 'encrypted:access:token',
        tokenExpiresAt: new Date(Date.now() + 3600000),
      } as any);

      (decryptToken as jest.Mock).mockReturnValue('access-token-123');

      const mockEventsList = jest.fn().mockResolvedValue({
        data: {
          items: [],
          nextSyncToken: 'initial-sync-token',
        },
      });

      const mockCalendar = {
        events: {
          list: mockEventsList,
        },
      };

      const mockOAuth2Client = {
        setCredentials: jest.fn(),
      };

      (google.auth.OAuth2 as jest.Mock) = jest.fn(() => mockOAuth2Client);
      (google.calendar as jest.Mock) = jest.fn(() => mockCalendar);

      const client = new GoogleCalendarClient();
      await client.importEvents(connectionId);

      expect(mockEventsList).toHaveBeenCalledWith({
        calendarId: 'primary',
        timeMin: expect.any(String), // ISO date string
        maxResults: 250,
        singleEvents: true,
        orderBy: 'startTime',
      });
    });

    it('should handle cancelled events (status: cancelled)', async () => {
      const connectionId = 'connection-123';

      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        id: connectionId,
        googleCalendarId: 'primary',
        syncToken: 'sync-token',
        accessToken: 'encrypted:access:token',
        tokenExpiresAt: new Date(Date.now() + 3600000),
      } as any);

      (decryptToken as jest.Mock).mockReturnValue('access-token-123');

      const mockEventsList = jest.fn().mockResolvedValue({
        data: {
          items: [
            {
              id: 'cancelled-event',
              status: 'cancelled',
            },
          ],
          nextSyncToken: 'new-sync-token',
        },
      });

      const mockCalendar = {
        events: {
          list: mockEventsList,
        },
      };

      const mockOAuth2Client = {
        setCredentials: jest.fn(),
      };

      (google.auth.OAuth2 as jest.Mock) = jest.fn(() => mockOAuth2Client);
      (google.calendar as jest.Mock) = jest.fn(() => mockCalendar);

      const client = new GoogleCalendarClient();
      const events = await client.importEvents(connectionId);

      expect(events.items).toHaveLength(1);
      expect(events.items[0]).toEqual({
        googleEventId: 'cancelled-event',
        status: 'cancelled',
      });
    });

    it('should handle sync token invalidation and fallback to full sync', async () => {
      const connectionId = 'connection-123';

      // Mock findUnique - importEvents calls it, then getCalendar calls it again
      // After 410 error, recursive importEvents calls it again (twice more)
      const connectionWithInvalidToken = {
        id: connectionId,
        googleCalendarId: 'primary',
        syncToken: 'invalid-sync-token',
        accessToken: 'encrypted:access:token',
        tokenExpiresAt: new Date(Date.now() + 3600000),
      } as any;

      const connectionWithNullToken = {
        id: connectionId,
        googleCalendarId: 'primary',
        syncToken: null, // Reset to null after 410 error
        accessToken: 'encrypted:access:token',
        tokenExpiresAt: new Date(Date.now() + 3600000),
      } as any;

      prismaMock.calendarConnection.findUnique
        .mockResolvedValueOnce(connectionWithInvalidToken) // importEvents - first call
        .mockResolvedValueOnce(connectionWithInvalidToken) // getCalendar - first call
        .mockResolvedValueOnce(connectionWithNullToken) // importEvents - recursive call
        .mockResolvedValueOnce(connectionWithNullToken); // getCalendar - recursive call

      (decryptToken as jest.Mock).mockReturnValue('access-token-123');

      const mockEventsList = jest
        .fn()
        .mockRejectedValueOnce({
          code: 410,
          message: 'Sync token is no longer valid',
        })
        .mockResolvedValueOnce({
          data: {
            items: [],
            nextSyncToken: 'new-sync-token',
          },
        });

      const mockCalendar = {
        events: {
          list: mockEventsList,
        },
      };

      const mockOAuth2Client = {
        setCredentials: jest.fn(),
      };

      (google.auth.OAuth2 as jest.Mock) = jest.fn(() => mockOAuth2Client);
      (google.calendar as jest.Mock) = jest.fn(() => mockCalendar);

      prismaMock.calendarConnection.update.mockResolvedValue({} as any);

      const client = new GoogleCalendarClient();
      await client.importEvents(connectionId);

      expect(mockEventsList).toHaveBeenCalledTimes(2);
      // Second call should be full sync without syncToken
      expect(mockEventsList).toHaveBeenLastCalledWith({
        calendarId: 'primary',
        timeMin: expect.any(String),
        maxResults: 250,
        singleEvents: true,
        orderBy: 'startTime',
      });
    });
  });

  describe('exportEvent', () => {
    it('should create event in Google Calendar', async () => {
      const connectionId = 'connection-123';
      const event = {
        title: 'Doctor Appointment',
        startTime: new Date('2026-01-10T14:00:00Z'),
        endTime: new Date('2026-01-10T15:00:00Z'),
        description: 'Annual checkup',
        isAllDay: false,
      };

      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        id: connectionId,
        googleCalendarId: 'primary',
        accessToken: 'encrypted:access:token',
        tokenExpiresAt: new Date(Date.now() + 3600000),
      } as any);

      (decryptToken as jest.Mock).mockReturnValue('access-token-123');

      const mockEventsInsert = jest.fn().mockResolvedValue({
        data: {
          id: 'google-event-new',
          htmlLink: 'https://calendar.google.com/event?eid=xyz',
        },
      });

      const mockCalendar = {
        events: {
          insert: mockEventsInsert,
        },
      };

      const mockOAuth2Client = {
        setCredentials: jest.fn(),
      };

      (google.auth.OAuth2 as jest.Mock) = jest.fn(() => mockOAuth2Client);
      (google.calendar as jest.Mock) = jest.fn(() => mockCalendar);

      const client = new GoogleCalendarClient();
      const result = await client.exportEvent(connectionId, event);

      expect(mockEventsInsert).toHaveBeenCalledWith({
        calendarId: 'primary',
        requestBody: {
          summary: 'Doctor Appointment',
          description: 'Annual checkup',
          start: {
            dateTime: '2026-01-10T14:00:00.000Z',
            timeZone: 'UTC',
          },
          end: {
            dateTime: '2026-01-10T15:00:00.000Z',
            timeZone: 'UTC',
          },
        },
      });

      expect(result).toEqual({
        googleEventId: 'google-event-new',
        htmlLink: 'https://calendar.google.com/event?eid=xyz',
      });
    });

    it('should handle all-day events correctly', async () => {
      const connectionId = 'connection-123';
      const event = {
        title: 'Birthday',
        startTime: new Date('2026-01-15'),
        endTime: new Date('2026-01-15'),
        isAllDay: true,
      };

      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        id: connectionId,
        googleCalendarId: 'primary',
        accessToken: 'encrypted:access:token',
        tokenExpiresAt: new Date(Date.now() + 3600000),
      } as any);

      (decryptToken as jest.Mock).mockReturnValue('access-token-123');

      const mockEventsInsert = jest.fn().mockResolvedValue({
        data: {
          id: 'google-event-allday',
        },
      });

      const mockCalendar = {
        events: {
          insert: mockEventsInsert,
        },
      };

      const mockOAuth2Client = {
        setCredentials: jest.fn(),
      };

      (google.auth.OAuth2 as jest.Mock) = jest.fn(() => mockOAuth2Client);
      (google.calendar as jest.Mock) = jest.fn(() => mockCalendar);

      const client = new GoogleCalendarClient();
      await client.exportEvent(connectionId, event);

      expect(mockEventsInsert).toHaveBeenCalledWith({
        calendarId: 'primary',
        requestBody: {
          summary: 'Birthday',
          start: {
            date: '2026-01-15',
          },
          end: {
            date: '2026-01-15',
          },
        },
      });
    });
  });

  describe('updateEvent', () => {
    it('should update existing event in Google Calendar', async () => {
      const connectionId = 'connection-123';
      const googleEventId = 'google-event-existing';
      const event = {
        title: 'Updated Meeting',
        startTime: new Date('2026-01-10T15:00:00Z'),
        endTime: new Date('2026-01-10T16:00:00Z'),
        description: 'Updated description',
        isAllDay: false,
      };

      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        id: connectionId,
        googleCalendarId: 'primary',
        accessToken: 'encrypted:access:token',
        tokenExpiresAt: new Date(Date.now() + 3600000),
      } as any);

      (decryptToken as jest.Mock).mockReturnValue('access-token-123');

      const mockEventsUpdate = jest.fn().mockResolvedValue({
        data: {
          id: googleEventId,
        },
      });

      const mockCalendar = {
        events: {
          update: mockEventsUpdate,
        },
      };

      const mockOAuth2Client = {
        setCredentials: jest.fn(),
      };

      (google.auth.OAuth2 as jest.Mock) = jest.fn(() => mockOAuth2Client);
      (google.calendar as jest.Mock) = jest.fn(() => mockCalendar);

      const client = new GoogleCalendarClient();
      await client.updateEvent(connectionId, googleEventId, event);

      expect(mockEventsUpdate).toHaveBeenCalledWith({
        calendarId: 'primary',
        eventId: googleEventId,
        requestBody: {
          summary: 'Updated Meeting',
          description: 'Updated description',
          start: {
            dateTime: '2026-01-10T15:00:00.000Z',
            timeZone: 'UTC',
          },
          end: {
            dateTime: '2026-01-10T16:00:00.000Z',
            timeZone: 'UTC',
          },
        },
      });
    });
  });

  describe('deleteEvent', () => {
    it('should delete event from Google Calendar', async () => {
      const connectionId = 'connection-123';
      const googleEventId = 'google-event-to-delete';

      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        id: connectionId,
        googleCalendarId: 'primary',
        accessToken: 'encrypted:access:token',
        tokenExpiresAt: new Date(Date.now() + 3600000),
      } as any);

      (decryptToken as jest.Mock).mockReturnValue('access-token-123');

      const mockEventsDelete = jest.fn().mockResolvedValue({});

      const mockCalendar = {
        events: {
          delete: mockEventsDelete,
        },
      };

      const mockOAuth2Client = {
        setCredentials: jest.fn(),
      };

      (google.auth.OAuth2 as jest.Mock) = jest.fn(() => mockOAuth2Client);
      (google.calendar as jest.Mock) = jest.fn(() => mockCalendar);

      const client = new GoogleCalendarClient();
      await client.deleteEvent(connectionId, googleEventId);

      expect(mockEventsDelete).toHaveBeenCalledWith({
        calendarId: 'primary',
        eventId: googleEventId,
      });
    });

    it('should handle event not found error gracefully', async () => {
      const connectionId = 'connection-123';
      const googleEventId = 'non-existent-event';

      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        id: connectionId,
        googleCalendarId: 'primary',
        accessToken: 'encrypted:access:token',
        tokenExpiresAt: new Date(Date.now() + 3600000),
      } as any);

      (decryptToken as jest.Mock).mockReturnValue('access-token-123');

      const mockEventsDelete = jest.fn().mockRejectedValue({
        code: 404,
        message: 'Not found',
      });

      const mockCalendar = {
        events: {
          delete: mockEventsDelete,
        },
      };

      const mockOAuth2Client = {
        setCredentials: jest.fn(),
      };

      (google.auth.OAuth2 as jest.Mock) = jest.fn(() => mockOAuth2Client);
      (google.calendar as jest.Mock) = jest.fn(() => mockCalendar);

      const client = new GoogleCalendarClient();

      // Should not throw - treat 404 as success (already deleted)
      await expect(client.deleteEvent(connectionId, googleEventId)).resolves.not.toThrow();
    });
  });

  describe('getUserEmail', () => {
    it('should retrieve Google account email', async () => {
      const connectionId = 'connection-123';

      prismaMock.calendarConnection.findUnique.mockResolvedValue({
        id: connectionId,
        accessToken: 'encrypted:access:token',
        tokenExpiresAt: new Date(Date.now() + 3600000),
      } as any);

      (decryptToken as jest.Mock).mockReturnValue('access-token-123');

      const mockOAuth2Client = {
        setCredentials: jest.fn(),
        getTokenInfo: jest.fn().mockResolvedValue({
          email: 'user@example.com',
        }),
      };

      (google.auth.OAuth2 as jest.Mock) = jest.fn(() => mockOAuth2Client);

      const client = new GoogleCalendarClient();
      const email = await client.getUserEmail(connectionId);

      expect(email).toBe('user@example.com');
    });
  });
});
