/**
 * Onboarding API Integration Tests
 *
 * Tests the onboarding flow:
 * - GET /api/onboarding/check - Check if onboarding is complete
 * - POST /api/onboarding/setup - Complete initial setup
 */

import { NextRequest } from 'next/server';
import { GET as checkOnboardingStatus } from '@/app/api/onboarding/check/route';
import { POST as completeOnboarding } from '@/app/api/onboarding/setup/route';
import { prismaMock } from '@/lib/test-utils/prisma-mock';

describe('GET /api/onboarding/check', () => {
  it('should return onboarding incomplete when no system config exists', async () => {
    prismaMock.systemConfig.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/onboarding/check');
    const response = await checkOnboardingStatus(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      onboardingComplete: false,
      setupRequired: true,
    });
  });

  it('should return onboarding incomplete when explicitly set to false', async () => {
    prismaMock.systemConfig.findUnique.mockResolvedValue({
      id: 'system',
      onboardingComplete: false,
      setupCompletedAt: null,
      setupCompletedBy: null,
      version: '0.1.0',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = new NextRequest('http://localhost:3000/api/onboarding/check');
    const response = await checkOnboardingStatus(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      onboardingComplete: false,
      setupRequired: true,
    });
  });

  it('should return onboarding complete when set to true', async () => {
    const setupDate = new Date('2025-01-01T00:00:00Z');
    prismaMock.systemConfig.findUnique.mockResolvedValue({
      id: 'system',
      onboardingComplete: true,
      setupCompletedAt: setupDate,
      setupCompletedBy: 'user-123',
      version: '0.1.0',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = new NextRequest('http://localhost:3000/api/onboarding/check');
    const response = await checkOnboardingStatus(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      onboardingComplete: true,
      setupRequired: false,
      setupCompletedAt: setupDate.toISOString(),
    });
  });

  it('should handle database errors gracefully', async () => {
    prismaMock.systemConfig.findUnique.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/onboarding/check');
    const response = await checkOnboardingStatus(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to check onboarding status');
  });
});

describe('POST /api/onboarding/setup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject setup if onboarding is already complete', async () => {
    prismaMock.systemConfig.findUnique.mockResolvedValue({
      id: 'system',
      onboardingComplete: true,
      setupCompletedAt: new Date(),
      setupCompletedBy: 'user-123',
      version: '0.1.0',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = new NextRequest('http://localhost:3000/api/onboarding/setup', {
      method: 'POST',
      body: JSON.stringify({
        familyName: 'Test Family',
        timezone: 'America/New_York',
        adminName: 'John Doe',
        adminEmail: 'john@example.com',
        adminPassword: 'SecurePass123!',
      }),
    });

    const response = await completeOnboarding(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Onboarding already complete');
  });

  it('should validate required fields', async () => {
    prismaMock.systemConfig.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/onboarding/setup', {
      method: 'POST',
      body: JSON.stringify({
        familyName: '',
        timezone: 'America/New_York',
      }),
    });

    const response = await completeOnboarding(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('required');
  });

  it('should validate email format', async () => {
    prismaMock.systemConfig.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/onboarding/setup', {
      method: 'POST',
      body: JSON.stringify({
        familyName: 'Test Family',
        timezone: 'America/New_York',
        adminName: 'John Doe',
        adminEmail: 'invalid-email',
        adminPassword: 'SecurePass123!',
      }),
    });

    const response = await completeOnboarding(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('email');
  });

  it('should validate password strength (minimum 8 characters)', async () => {
    prismaMock.systemConfig.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/onboarding/setup', {
      method: 'POST',
      body: JSON.stringify({
        familyName: 'Test Family',
        timezone: 'America/New_York',
        adminName: 'John Doe',
        adminEmail: 'john@example.com',
        adminPassword: 'weak',
      }),
    });

    const response = await completeOnboarding(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('password');
    expect(data.error).toContain('8 characters');
  });

  it('should successfully complete onboarding', async () => {
    prismaMock.systemConfig.findUnique.mockResolvedValue(null);

    const mockFamily = {
      id: 'family-123',
      name: 'Test Family',
      timezone: 'America/New_York',
      location: null,
      latitude: null,
      longitude: null,
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockMember = {
      id: 'member-123',
      familyId: 'family-123',
      name: 'John Doe',
      email: 'john@example.com',
      passwordHash: 'hashed-password',
      pin: null,
      role: 'PARENT' as const,
      birthDate: null,
      avatarUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
    };

    const mockSystemConfig = {
      id: 'system',
      onboardingComplete: true,
      setupCompletedAt: new Date(),
      setupCompletedBy: 'member-123',
      version: '0.1.0',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock the transaction
    prismaMock.$transaction.mockImplementation(async (callback: any) => {
      return callback(prismaMock);
    });

    prismaMock.family.create.mockResolvedValue(mockFamily);
    prismaMock.familyMember.create.mockResolvedValue(mockMember);
    prismaMock.systemConfig.upsert.mockResolvedValue(mockSystemConfig);

    const request = new NextRequest('http://localhost:3000/api/onboarding/setup', {
      method: 'POST',
      body: JSON.stringify({
        familyName: 'Test Family',
        timezone: 'America/New_York',
        adminName: 'John Doe',
        adminEmail: 'john@example.com',
        adminPassword: 'SecurePass123!',
      }),
    });

    const response = await completeOnboarding(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.family).toEqual({
      id: mockFamily.id,
      name: mockFamily.name,
      timezone: mockFamily.timezone,
    });
    expect(data.admin).toEqual({
      id: mockMember.id,
      name: mockMember.name,
      email: mockMember.email,
      role: mockMember.role,
    });

    // Verify family was created
    expect(prismaMock.family.create).toHaveBeenCalledWith({
      data: {
        name: 'Test Family',
        timezone: 'America/New_York',
      },
    });

    // Verify admin was created with hashed password
    expect(prismaMock.familyMember.create).toHaveBeenCalled();
    const createCall = (prismaMock.familyMember.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.email).toBe('john@example.com');
    expect(createCall.data.role).toBe('PARENT');
    expect(createCall.data.passwordHash).toBeDefined();
    expect(createCall.data.passwordHash).not.toBe('SecurePass123!'); // Should be hashed

    // Verify system config was updated
    expect(prismaMock.systemConfig.upsert).toHaveBeenCalledWith({
      where: { id: 'system' },
      create: {
        id: 'system',
        onboardingComplete: true,
        setupCompletedAt: expect.any(Date),
        setupCompletedBy: mockMember.id,
      },
      update: {
        onboardingComplete: true,
        setupCompletedAt: expect.any(Date),
        setupCompletedBy: mockMember.id,
      },
    });
  });

  it('should handle database transaction failures', async () => {
    prismaMock.systemConfig.findUnique.mockResolvedValue(null);
    prismaMock.$transaction.mockRejectedValue(new Error('Transaction failed'));

    const request = new NextRequest('http://localhost:3000/api/onboarding/setup', {
      method: 'POST',
      body: JSON.stringify({
        familyName: 'Test Family',
        timezone: 'America/New_York',
        adminName: 'John Doe',
        adminEmail: 'john@example.com',
        adminPassword: 'SecurePass123!',
      }),
    });

    const response = await completeOnboarding(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to complete onboarding');
  });

  it('should handle duplicate email errors', async () => {
    prismaMock.systemConfig.findUnique.mockResolvedValue(null);

    const duplicateError: any = new Error('Unique constraint failed');
    duplicateError.code = 'P2002';
    duplicateError.meta = { target: ['email'] };

    prismaMock.$transaction.mockRejectedValue(duplicateError);

    const request = new NextRequest('http://localhost:3000/api/onboarding/setup', {
      method: 'POST',
      body: JSON.stringify({
        familyName: 'Test Family',
        timezone: 'America/New_York',
        adminName: 'John Doe',
        adminEmail: 'existing@example.com',
        adminPassword: 'SecurePass123!',
      }),
    });

    const response = await completeOnboarding(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('email');
    expect(data.error).toContain('already exists');
  });

  it('should use default timezone if not provided', async () => {
    prismaMock.systemConfig.findUnique.mockResolvedValue(null);

    const mockFamily = {
      id: 'family-123',
      name: 'Test Family',
      timezone: 'America/New_York', // Default
      location: null,
      latitude: null,
      longitude: null,
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockMember = {
      id: 'member-123',
      familyId: 'family-123',
      name: 'John Doe',
      email: 'john@example.com',
      passwordHash: 'hashed-password',
      pin: null,
      role: 'PARENT' as const,
      birthDate: null,
      avatarUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
    };

    prismaMock.$transaction.mockImplementation(async (callback: any) => {
      return callback(prismaMock);
    });

    prismaMock.family.create.mockResolvedValue(mockFamily);
    prismaMock.familyMember.create.mockResolvedValue(mockMember);
    prismaMock.systemConfig.upsert.mockResolvedValue({
      id: 'system',
      onboardingComplete: true,
      setupCompletedAt: new Date(),
      setupCompletedBy: 'member-123',
      version: '0.1.0',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = new NextRequest('http://localhost:3000/api/onboarding/setup', {
      method: 'POST',
      body: JSON.stringify({
        familyName: 'Test Family',
        // No timezone provided
        adminName: 'John Doe',
        adminEmail: 'john@example.com',
        adminPassword: 'SecurePass123!',
      }),
    });

    const response = await completeOnboarding(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.family.timezone).toBe('America/New_York');
  });
});
