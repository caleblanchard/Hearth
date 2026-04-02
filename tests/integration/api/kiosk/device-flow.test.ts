import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { POST as ActivationComplete } from '@/app/api/kiosk/activation/complete/route';
import { POST as Unlock } from '@/app/api/kiosk/unlock/route';
import { POST as Heartbeat } from '@/app/api/kiosk/session/heartbeat/route';
import { POST as Logout } from '@/app/api/kiosk/logout/route';
import { authenticateDeviceSecret, authenticateChildSession, insertChildSession } from '@/lib/kiosk-auth';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
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

describe('Kiosk device/child flow', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.resetAllMocks();
    mockSupabase = {
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      is: jest.fn(() => mockSupabase),
      gte: jest.fn(() => mockSupabase),
      insert: jest.fn(() => mockSupabase),
      update: jest.fn(() => mockSupabase),
      maybeSingle: jest.fn(() => mockSupabase),
      single: jest.fn(() => mockSupabase),
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it('activation complete rejects invalid code', async () => {
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.is.mockReturnValue(mockSupabase);
    mockSupabase.gte.mockReturnValue(mockSupabase);
    mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

    const req = new NextRequest('http://localhost/api/kiosk/activation/complete', {
      method: 'POST',
      body: JSON.stringify({ code: 'BAD', deviceId: 'dev1' }),
    });
    const res = await ActivationComplete(req);
    expect(res.status).toBe(400);
  });

  it('unlock requires valid device', async () => {
    (authenticateDeviceSecret as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/kiosk/unlock', {
      method: 'POST',
      body: JSON.stringify({ memberId: 'm1', pin: '1234' }),
    });
    const res = await Unlock(req);
    expect(res.status).toBe(401);
  });

  it('heartbeat and logout require child session', async () => {
    (authenticateChildSession as jest.Mock).mockResolvedValue(null);
    const hbReq = new NextRequest('http://localhost/api/kiosk/session/heartbeat', { method: 'POST' });
    const hbRes = await Heartbeat();
    expect(hbRes.status).toBe(401);

    const loReq = new NextRequest('http://localhost/api/kiosk/logout', { method: 'POST' });
    const loRes = await Logout();
    expect(loRes.status).toBe(401);
  });
});
