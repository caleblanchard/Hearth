import { NextRequest } from 'next/server';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock data module
jest.mock('@/lib/data/screen-time-lifecycle', () => {
  class MockScreenTimeLifecycleError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return {
    ScreenTimeLifecycleError: MockScreenTimeLifecycleError,
    isScreenTimeLifecycleError: (error: unknown) =>
      error instanceof MockScreenTimeLifecycleError,
    getScreenTimeLifecycleFamilyOverview: jest.fn(),
  };
});

const {
  ScreenTimeLifecycleError,
  getScreenTimeLifecycleFamilyOverview,
} = jest.requireMock('@/lib/data/screen-time-lifecycle');
import { GET } from '@/app/api/screentime/family/route';

const mockGetScreenTimeLifecycleFamilyOverview =
  getScreenTimeLifecycleFamilyOverview as jest.Mock;

describe('/api/screentime/family', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 403 if not a parent', async () => {
    mockChildSession();

    mockGetScreenTimeLifecycleFamilyOverview.mockRejectedValue(
      new ScreenTimeLifecycleError(403, 'Unauthorized - Parent access required')
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Unauthorized - Parent access required');
  });

  it('should return family overview', async () => {
    mockParentSession();

    const mockOverview = {
      members: [
        {
          member: { id: 'child-1', name: 'Child One', avatarUrl: null },
          allowances: [],
          stats: { totalMinutes: 60, byType: { Games: 60 }, sessionCount: 1 },
        },
        {
          member: { id: 'child-2', name: 'Child Two', avatarUrl: null },
          allowances: [],
          stats: { totalMinutes: 45, byType: { Games: 45 }, sessionCount: 1 },
        },
      ],
    };

    mockGetScreenTimeLifecycleFamilyOverview.mockResolvedValue(mockOverview);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.overview).toEqual(mockOverview);
    expect(mockGetScreenTimeLifecycleFamilyOverview).toHaveBeenCalledWith();
  });

  it('should return 500 on error', async () => {
    mockParentSession();

    mockGetScreenTimeLifecycleFamilyOverview.mockRejectedValue(new Error('Database error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to get overview');
  });
});
