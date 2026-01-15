// @ts-nocheck
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';
import {
  checkGraceEligibility,
  countGraceUses,
  processGraceRepayment,
  getOrCreateGraceSettings,
} from '@/lib/screentime-grace';
import { GraceRepaymentMode, RepaymentStatus } from '@/app/generated/prisma';

describe('screentime-grace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  describe('checkGraceEligibility', () => {
    const mockSettings = {
      id: 'settings-1',
      memberId: 'member-1',
      gracePeriodMinutes: 15,
      maxGracePerDay: 1,
      maxGracePerWeek: 3,
      graceRepaymentMode: GraceRepaymentMode.DEDUCT_NEXT_WEEK,
      lowBalanceWarningMinutes: 10,
      requiresApproval: false,
        updatedAt: new Date(),
      createdAt: new Date(),
    };

    it('should return eligible when balance is low and under limits', async () => {
      // Mock balance check
      prismaMock.screenTimeBalance.findUnique.mockResolvedValue({
        id: 'balance-1',
        memberId: 'member-1',
        currentBalanceMinutes: 8,
        weekStartDate: new Date(),
        updatedAt: new Date(),
        createdAt: new Date(),
      });

      // Mock grace log count (0 uses today, 0 uses this week)
      prismaMock.gracePeriodLog.count.mockResolvedValue(0);

      const result = await checkGraceEligibility('member-1', mockSettings);

      expect(result.eligible).toBe(true);
      expect(result.remainingDaily).toBe(1);
      expect(result.remainingWeekly).toBe(3);
      expect(result.reason).toBeUndefined();
    });

    it('should return ineligible when balance is sufficient', async () => {
      prismaMock.screenTimeBalance.findUnique.mockResolvedValue({
        id: 'balance-1',
        memberId: 'member-1',
        currentBalanceMinutes: 50,
        weekStartDate: new Date(),
        updatedAt: new Date(),
        createdAt: new Date(),
      });

      prismaMock.gracePeriodLog.count.mockResolvedValue(0);

      const result = await checkGraceEligibility('member-1', mockSettings);

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Balance is not low enough');
      expect(result.remainingDaily).toBe(1);
      expect(result.remainingWeekly).toBe(3);
    });

    it('should return ineligible when daily limit exceeded', async () => {
      prismaMock.screenTimeBalance.findUnique.mockResolvedValue({
        id: 'balance-1',
        memberId: 'member-1',
        currentBalanceMinutes: 5,
        weekStartDate: new Date(),
        updatedAt: new Date(),
        createdAt: new Date(),
      });

      // Mock 1 use today (daily limit is 1)
      prismaMock.gracePeriodLog.count
        .mockResolvedValueOnce(1) // Today's count
        .mockResolvedValueOnce(1); // Week's count

      const result = await checkGraceEligibility('member-1', mockSettings);

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Daily grace limit exceeded');
      expect(result.remainingDaily).toBe(0);
      expect(result.remainingWeekly).toBe(2);
    });

    it('should return ineligible when weekly limit exceeded', async () => {
      prismaMock.screenTimeBalance.findUnique.mockResolvedValue({
        id: 'balance-1',
        memberId: 'member-1',
        currentBalanceMinutes: 5,
        weekStartDate: new Date(),
        updatedAt: new Date(),
        createdAt: new Date(),
      });

      // Mock 0 uses today, but 3 uses this week (weekly limit is 3)
      prismaMock.gracePeriodLog.count
        .mockResolvedValueOnce(0) // Today's count
        .mockResolvedValueOnce(3); // Week's count

      const result = await checkGraceEligibility('member-1', mockSettings);

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Weekly grace limit exceeded');
      expect(result.remainingDaily).toBe(1);
      expect(result.remainingWeekly).toBe(0);
    });

    it('should count remaining daily and weekly requests correctly', async () => {
      prismaMock.screenTimeBalance.findUnique.mockResolvedValue({
        id: 'balance-1',
        memberId: 'member-1',
        currentBalanceMinutes: 5,
        weekStartDate: new Date(),
        updatedAt: new Date(),
        createdAt: new Date(),
      });

      // Used 0 today, 2 this week
      prismaMock.gracePeriodLog.count
        .mockResolvedValueOnce(0) // Today
        .mockResolvedValueOnce(2); // Week

      const result = await checkGraceEligibility('member-1', mockSettings);

      expect(result.remainingDaily).toBe(1); // 1 - 0 = 1
      expect(result.remainingWeekly).toBe(1); // 3 - 2 = 1
    });

    it('should return ineligible when no balance found', async () => {
      prismaMock.screenTimeBalance.findUnique.mockResolvedValue(null);

      const result = await checkGraceEligibility('member-1', mockSettings);

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Balance not found');
    });
  });

  describe('countGraceUses', () => {
    it('should count grace logs for date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-02');

      prismaMock.gracePeriodLog.count.mockResolvedValue(3);

      const count = await countGraceUses('member-1', startDate, endDate);

      expect(count).toBe(3);
      expect(prismaMock.gracePeriodLog.count).toHaveBeenCalledWith({
        where: {
          memberId: 'member-1',
          requestedAt: {
            gte: startDate,
            lte: endDate,
          },
          repaymentStatus: RepaymentStatus.PENDING,
        },
      });
    });

    it('should filter by status (PENDING, DEDUCTED, etc.)', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-02');

      prismaMock.gracePeriodLog.count.mockResolvedValue(2);

      const count = await countGraceUses(
        'member-1',
        startDate,
        endDate,
        RepaymentStatus.DEDUCTED
      );

      expect(count).toBe(2);
      expect(prismaMock.gracePeriodLog.count).toHaveBeenCalledWith({
        where: {
          memberId: 'member-1',
          requestedAt: {
            gte: startDate,
            lte: endDate,
          },
          repaymentStatus: RepaymentStatus.DEDUCTED,
        },
      });
    });

    it('should handle empty results', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-02');

      prismaMock.gracePeriodLog.count.mockResolvedValue(0);

      const count = await countGraceUses('member-1', startDate, endDate);

      expect(count).toBe(0);
    });
  });

  describe('processGraceRepayment', () => {
    it('should deduct from next week allocation (DEDUCT_NEXT_WEEK mode)', async () => {
      const pendingLogs = [
        {
          id: 'log-1',
          memberId: 'member-1',
          minutesGranted: 15,
          requestedAt: new Date(),
          reason: null,
          approvedById: null,
          repaymentStatus: RepaymentStatus.PENDING,
          repaidAt: null,
          relatedTransactionId: null,
        },
        {
          id: 'log-2',
          memberId: 'member-1',
          minutesGranted: 10,
          requestedAt: new Date(),
          reason: null,
          approvedById: null,
          repaymentStatus: RepaymentStatus.PENDING,
          repaidAt: null,
          relatedTransactionId: null,
        },
      ];

      const settings = {
        id: 'settings-1',
        memberId: 'member-1',
        gracePeriodMinutes: 15,
        maxGracePerDay: 1,
        maxGracePerWeek: 3,
        graceRepaymentMode: GraceRepaymentMode.DEDUCT_NEXT_WEEK,
        lowBalanceWarningMinutes: 10,
        requiresApproval: false,
        updatedAt: new Date(),
        createdAt: new Date(),
      };

      const balance = {
        id: 'balance-1',
        memberId: 'member-1',
        currentBalanceMinutes: 100,
        weekStartDate: new Date(),
        updatedAt: new Date(),
        createdAt: new Date(),
      };

      prismaMock.gracePeriodLog.findMany.mockResolvedValue(pendingLogs);
      prismaMock.screenTimeGraceSettings.findUnique.mockResolvedValue(settings);
      prismaMock.screenTimeBalance.findUnique.mockResolvedValue(balance);

      // Mock transaction creation
      prismaMock.screenTimeTransaction.create.mockResolvedValue({
        id: 'transaction-1',
        memberId: 'member-1',
        type: 'GRACE_REPAID' as any,
        amountMinutes: -25,
        balanceAfter: 75,
        reason: 'Grace period repayment',
        createdById: 'member-1',
        createdAt: new Date(),
        deviceType: null,
        notes: null,
      });

      // Mock balance update
      prismaMock.screenTimeBalance.update.mockResolvedValue({
        ...balance,
        currentBalanceMinutes: 75,
        weekStartDate: new Date(),
        updatedAt: new Date(),
      });

      // Mock grace log updates
      prismaMock.gracePeriodLog.update.mockResolvedValue(pendingLogs[0]);

      const result = await processGraceRepayment('member-1');

      expect(result.totalRepaid).toBe(25); // 15 + 10
      expect(result.logsProcessed).toBe(2);

      // Verify transaction created
      expect(prismaMock.screenTimeTransaction.create).toHaveBeenCalled();

      // Verify balance updated
      expect(prismaMock.screenTimeBalance.update).toHaveBeenCalledWith({
        where: { memberId: 'member-1' },
        data: { currentBalanceMinutes: 75 }, // 100 - 25
      });

      // Verify logs updated
      expect(prismaMock.gracePeriodLog.update).toHaveBeenCalledTimes(2);
    });

    it('should handle FORGIVE mode correctly', async () => {
      const pendingLogs = [
        {
          id: 'log-1',
          memberId: 'member-1',
          minutesGranted: 15,
          requestedAt: new Date(),
          reason: null,
          approvedById: null,
          repaymentStatus: RepaymentStatus.PENDING,
          repaidAt: null,
          relatedTransactionId: null,
        },
      ];

      const settings = {
        id: 'settings-1',
        memberId: 'member-1',
        gracePeriodMinutes: 15,
        maxGracePerDay: 1,
        maxGracePerWeek: 3,
        graceRepaymentMode: GraceRepaymentMode.FORGIVE,
        lowBalanceWarningMinutes: 10,
        requiresApproval: false,
        updatedAt: new Date(),
        createdAt: new Date(),
      };

      prismaMock.gracePeriodLog.findMany.mockResolvedValue(pendingLogs);
      prismaMock.screenTimeGraceSettings.findUnique.mockResolvedValue(settings);

      // Mock grace log update
      prismaMock.gracePeriodLog.update.mockResolvedValue({
        ...pendingLogs[0],
        repaymentStatus: RepaymentStatus.FORGIVEN,
        repaidAt: new Date(),
      });

      const result = await processGraceRepayment('member-1');

      expect(result.totalRepaid).toBe(0); // Nothing deducted
      expect(result.logsProcessed).toBe(1);

      // Verify logs marked as FORGIVEN
      expect(prismaMock.gracePeriodLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: {
          repaymentStatus: RepaymentStatus.FORGIVEN,
          repaidAt: expect.any(Date),
        },
      });

      // Verify no balance deduction
      expect(prismaMock.screenTimeBalance.update).not.toHaveBeenCalled();
    });

    it('should update grace log repayment status', async () => {
      const pendingLogs = [
        {
          id: 'log-1',
          memberId: 'member-1',
          minutesGranted: 15,
          requestedAt: new Date(),
          reason: null,
          approvedById: null,
          repaymentStatus: RepaymentStatus.PENDING,
          repaidAt: null,
          relatedTransactionId: null,
        },
      ];

      const settings = {
        id: 'settings-1',
        memberId: 'member-1',
        gracePeriodMinutes: 15,
        maxGracePerDay: 1,
        maxGracePerWeek: 3,
        graceRepaymentMode: GraceRepaymentMode.DEDUCT_NEXT_WEEK,
        lowBalanceWarningMinutes: 10,
        requiresApproval: false,
        updatedAt: new Date(),
        createdAt: new Date(),
      };

      const balance = {
        id: 'balance-1',
        memberId: 'member-1',
        currentBalanceMinutes: 100,
        weekStartDate: new Date(),
        updatedAt: new Date(),
        createdAt: new Date(),
      };

      prismaMock.gracePeriodLog.findMany.mockResolvedValue(pendingLogs);
      prismaMock.screenTimeGraceSettings.findUnique.mockResolvedValue(settings);
      prismaMock.screenTimeBalance.findUnique.mockResolvedValue(balance);

      prismaMock.screenTimeTransaction.create.mockResolvedValue({
        id: 'transaction-1',
        memberId: 'member-1',
        type: 'GRACE_REPAID' as any,
        amountMinutes: -15,
        balanceAfter: 85,
        reason: 'Grace period repayment',
        createdById: 'member-1',
        createdAt: new Date(),
        deviceType: null,
        notes: null,
      });

      prismaMock.screenTimeBalance.update.mockResolvedValue({
        ...balance,
        currentBalanceMinutes: 85,
        weekStartDate: new Date(),
        updatedAt: new Date(),
      });

      prismaMock.gracePeriodLog.update.mockResolvedValue({
        ...pendingLogs[0],
        repaymentStatus: RepaymentStatus.DEDUCTED,
        repaidAt: new Date(),
        relatedTransactionId: 'transaction-1',
      });

      await processGraceRepayment('member-1');

      expect(prismaMock.gracePeriodLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: {
          repaymentStatus: RepaymentStatus.DEDUCTED,
          repaidAt: expect.any(Date),
          relatedTransactionId: 'transaction-1',
        },
      });
    });

    it('should handle no pending grace logs', async () => {
      prismaMock.gracePeriodLog.findMany.mockResolvedValue([]);

      const result = await processGraceRepayment('member-1');

      expect(result.totalRepaid).toBe(0);
      expect(result.logsProcessed).toBe(0);
    });
  });

  describe('getOrCreateGraceSettings', () => {
    it('should return existing settings if found', async () => {
      const existingSettings = {
        id: 'settings-1',
        memberId: 'member-1',
        gracePeriodMinutes: 20,
        maxGracePerDay: 2,
        maxGracePerWeek: 5,
        graceRepaymentMode: GraceRepaymentMode.EARN_BACK,
        lowBalanceWarningMinutes: 15,
        requiresApproval: true,
        updatedAt: new Date(),
        createdAt: new Date(),
      };

      prismaMock.screenTimeGraceSettings.findUnique.mockResolvedValue(
        existingSettings
      );

      const result = await getOrCreateGraceSettings('member-1');

      expect(result).toEqual(existingSettings);
      expect(prismaMock.screenTimeGraceSettings.create).not.toHaveBeenCalled();
    });

    it('should create default settings if not found', async () => {
      prismaMock.screenTimeGraceSettings.findUnique.mockResolvedValue(null);

      const defaultSettings = {
        id: 'new-settings-1',
        memberId: 'member-1',
        gracePeriodMinutes: 15,
        maxGracePerDay: 1,
        maxGracePerWeek: 3,
        graceRepaymentMode: GraceRepaymentMode.DEDUCT_NEXT_WEEK,
        lowBalanceWarningMinutes: 10,
        requiresApproval: false,
        updatedAt: new Date(),
        createdAt: new Date(),
      };

      prismaMock.screenTimeGraceSettings.create.mockResolvedValue(
        defaultSettings
      );

      const result = await getOrCreateGraceSettings('member-1');

      expect(result).toEqual(defaultSettings);
      expect(prismaMock.screenTimeGraceSettings.create).toHaveBeenCalledWith({
        data: {
          memberId: 'member-1',
          gracePeriodMinutes: 15,
          maxGracePerDay: 1,
          maxGracePerWeek: 3,
          graceRepaymentMode: GraceRepaymentMode.DEDUCT_NEXT_WEEK,
          lowBalanceWarningMinutes: 10,
          requiresApproval: false,
        updatedAt: new Date(),
        },
      });
    });

    it('should use correct default values', async () => {
      prismaMock.screenTimeGraceSettings.findUnique.mockResolvedValue(null);

      prismaMock.screenTimeGraceSettings.create.mockResolvedValue({
        id: 'new-settings-1',
        memberId: 'member-1',
        gracePeriodMinutes: 15,
        maxGracePerDay: 1,
        maxGracePerWeek: 3,
        graceRepaymentMode: GraceRepaymentMode.DEDUCT_NEXT_WEEK,
        lowBalanceWarningMinutes: 10,
        requiresApproval: false,
        updatedAt: new Date(),
        createdAt: new Date(),
      });

      await getOrCreateGraceSettings('member-1');

      expect(prismaMock.screenTimeGraceSettings.create).toHaveBeenCalledWith({
        data: {
          memberId: 'member-1',
          gracePeriodMinutes: 15, // Default
          maxGracePerDay: 1, // Default
          maxGracePerWeek: 3, // Default
          graceRepaymentMode: GraceRepaymentMode.DEDUCT_NEXT_WEEK, // Default
          lowBalanceWarningMinutes: 10, // Default
          requiresApproval: false, // Default
        },
      });
    });
  });
});
