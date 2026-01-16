/**
 * Integration Tests: /api/rules/templates
 *
 * GET - Get all rule templates
 *
 * TDD Red Phase: Write tests first
 */

// CRITICAL: Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock the templates module
jest.mock('@/lib/rules-engine/templates', () => ({
  getAllTemplates: jest.fn(),
  getTemplatesByCategory: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/rules/templates/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

const { getAllTemplates, getTemplatesByCategory } = require('@/lib/rules-engine/templates');

describe('GET /api/rules/templates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  const mockTemplates = [
    {
      id: 'chore_streak_bonus',
      name: 'Chore Streak Bonus',
      description: 'Award 10 credits for 7-day chore streak',
      category: 'rewards',
      trigger: { type: 'chore_streak', config: { days: 7 } },
      actions: [{ type: 'award_credits', config: { amount: 10, reason: 'Chore streak bonus!' } }],
      customizable: ['trigger.config.days', 'actions.0.config.amount'],
    },
    {
      id: 'screentime_warning',
      name: 'Low Screen Time Warning',
      description: 'Notify when screen time balance drops below 30 minutes',
      category: 'convenience',
      trigger: { type: 'screentime_low', config: { thresholdMinutes: 30 } },
      actions: [
        {
          type: 'send_notification',
          config: {
            recipients: ['child'],
            title: 'Screen Time Running Low',
            message: 'You have less than 30 minutes of screen time remaining.',
          },
        },
      ],
      customizable: ['trigger.config.thresholdMinutes'],
    },
  ];

  it('should return 401 if not authenticated', async () => {

    const request = new NextRequest('http://localhost:3000/api/rules/templates');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Unauthorized');
  });

  it('should return 403 if user is not a parent', async () => {

    const request = new NextRequest('http://localhost:3000/api/rules/templates');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Forbidden');
  });

  it('should return all templates when no category filter', async () => {
    getAllTemplates.mockReturnValue(mockTemplates);

    const request = new NextRequest('http://localhost:3000/api/rules/templates');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.templates).toEqual(mockTemplates);
    expect(data.templates).toHaveLength(2);
    expect(getAllTemplates).toHaveBeenCalled();
  });

  it('should filter templates by category', async () => {
    const rewardsTemplates = [mockTemplates[0]];
    getTemplatesByCategory.mockReturnValue(rewardsTemplates);

    const request = new NextRequest('http://localhost:3000/api/rules/templates?category=rewards');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.templates).toEqual(rewardsTemplates);
    expect(data.templates).toHaveLength(1);
    expect(data.templates[0].category).toBe('rewards');
    expect(getTemplatesByCategory).toHaveBeenCalledWith('rewards');
  });

  it('should support productivity category filter', async () => {
    getTemplatesByCategory.mockReturnValue([]);

    const request = new NextRequest(
      'http://localhost:3000/api/rules/templates?category=productivity'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getTemplatesByCategory).toHaveBeenCalledWith('productivity');
  });

  it('should support safety category filter', async () => {
    getTemplatesByCategory.mockReturnValue([]);

    const request = new NextRequest('http://localhost:3000/api/rules/templates?category=safety');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getTemplatesByCategory).toHaveBeenCalledWith('safety');
  });

  it('should support convenience category filter', async () => {
    const convenienceTemplates = [mockTemplates[1]];
    getTemplatesByCategory.mockReturnValue(convenienceTemplates);

    const request = new NextRequest(
      'http://localhost:3000/api/rules/templates?category=convenience'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.templates).toEqual(convenienceTemplates);
    expect(getTemplatesByCategory).toHaveBeenCalledWith('convenience');
  });

  it('should return 400 for invalid category', async () => {

    const request = new NextRequest(
      'http://localhost:3000/api/rules/templates?category=invalid'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid category');
  });

  it('should include customizable fields in template response', async () => {
    getAllTemplates.mockReturnValue(mockTemplates);

    const request = new NextRequest('http://localhost:3000/api/rules/templates');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.templates[0].customizable).toBeDefined();
    expect(data.templates[0].customizable).toBeInstanceOf(Array);
  });

  it('should return 500 on unexpected error', async () => {
    getAllTemplates.mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const request = new NextRequest('http://localhost:3000/api/rules/templates');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to fetch templates');
  });
});
