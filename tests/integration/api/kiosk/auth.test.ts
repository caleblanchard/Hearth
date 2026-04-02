import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authenticateDeviceSecret, hashSecret } from '@/lib/kiosk-auth';
import { POST as ActivationStart } from '@/app/api/kiosk/activation/start/route';
import { POST as ActivationComplete } from '@/app/api/kiosk/activation/complete/route';
import { POST as Unlock } from '@/app/api/kiosk/unlock/route';
import { POST as Logout } from '@/app/api/kiosk/logout/route';
import { POST as Heartbeat } from '@/app/api/kiosk/session/heartbeat/route';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  isParentInFamily: jest.fn(),
  getMemberInFamily: jest.fn(),
}));

jest.mock('@/lib/kiosk-auth', () => {
  const actual = jest.requireActual('@/lib/kiosk-auth');
  return {
    ...actual,
    authenticateDeviceSecret: jest.fn(),
    authenticateChildSession: jest.fn(),
    insertChildSession: jest.fn(),
  };
});

const { isParentInFamily, getMemberInFamily } = require('@/lib/supabase/server');
const { authenticateChildSession, insertChildSession } = require('@/lib/kiosk-auth');

describe('Kiosk device/child auth endpoints', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.resetAllMocks();
    mockSupabase = {
      auth: { getUser: jest.fn() },
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      is: jest.fn(() => mockSupabase),
      gte: jest.fn(() => mockSupabase),
      insert: jest.fn(() => mockSupabase),
      update: jest.fn(() => mockSupabase),
      single: jest.fn(() => mockSupabase),
      maybeSingle: jest.fn(() => mockSupabase),
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('POST /api/kiosk/activation/start', () => {
    it('rejects non-parents', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      isParentInFamily.mockResolvedValue(false);

      const req = new NextRequest('http://localhost/api/kiosk/activation/start', {
        method: 'POST',
        body: JSON.stringify({ familyId: 'fam1' }),
      });
      const res = await ActivationStart(req);
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/kiosk/activation/complete', () => {
    it('returns 400 for missing code/deviceId', async () => {
      const req = new NextRequest('http://localhost/api/kiosk/activation/complete', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const res = await ActivationComplete(req);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/kiosk/unlock', () => {
    it('rejects unauthorized device', async () => {
      (authenticateDeviceSecret as jest.Mock).mockResolvedValue(null);
      const req = new NextRequest('http://localhost/api/kiosk/unlock', {
        method: 'POST',
        body: JSON.stringify({ memberId: 'm1', pin: '1234' }),
      });
      const res = await Unlock(req);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/kiosk/session/heartbeat', () => {
    it('requires child session', async () => {
      (authenticateChildSession as jest.Mock).mockResolvedValue(null);
      const req = new NextRequest('http://localhost/api/kiosk/session/heartbeat', { method: 'POST' });
      const res = await Heartbeat();
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/kiosk/logout', () => {
    it('requires child session', async () => {
      (authenticateChildSession as jest.Mock).mockResolvedValue(null);
      const req = new NextRequest('http://localhost/api/kiosk/logout', { method: 'POST' });
      const res = await Logout();
      expect(res.status).toBe(401);
    });
  });
});
