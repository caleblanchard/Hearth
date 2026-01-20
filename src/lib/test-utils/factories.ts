import type { Frequency } from '@/app/generated/prisma'

export interface TestAllowanceSchedule {
  id: string
  memberId: string
  amount: number
  frequency: Frequency
  dayOfWeek: number | null
  dayOfMonth: number | null
  isActive: boolean
  isPaused: boolean
  startDate: Date
  endDate: Date | null
  lastProcessedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface TestSavingsGoal {
  id: string
  memberId: string
  name: string
  description?: string | null
  targetAmount: number
  currentAmount: number
  iconName: string
  color: string
  deadline?: Date | null
  isCompleted: boolean
  completedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export function createTestAllowanceSchedule(
  overrides?: Partial<TestAllowanceSchedule>
): TestAllowanceSchedule {
  const now = new Date()
  return {
    id: 'allowance-test-123',
    memberId: 'child-test-123',
    amount: 100,
    frequency: 'WEEKLY' as Frequency,
    dayOfWeek: 0, // Sunday
    dayOfMonth: null,
    isActive: true,
    isPaused: false,
    startDate: now,
    endDate: null,
    lastProcessedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function createTestSavingsGoal(
  overrides?: Partial<TestSavingsGoal>
): TestSavingsGoal {
  const now = new Date()
  return {
    id: 'goal-test-123',
    memberId: 'child-test-123',
    name: 'New Toy',
    description: 'Saving for a new toy',
    targetAmount: 500,
    currentAmount: 0,
    iconName: 'gift',
    color: 'blue',
    deadline: null,
    isCompleted: false,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function createTestCreditTransaction(overrides?: any) {
  const now = new Date()
  return {
    id: 'transaction-test-123',
    memberId: 'child-test-123',
    type: 'BONUS',
    amount: 100,
    balanceAfter: 100,
    reason: 'Test transaction',
    category: 'OTHER',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function createTestCreditBalance(overrides?: any) {
  const now = new Date()
  return {
    id: 'balance-test-123',
    memberId: 'child-test-123',
    currentBalance: 0,
    lifetimeEarned: 0,
    lifetimeSpent: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}
