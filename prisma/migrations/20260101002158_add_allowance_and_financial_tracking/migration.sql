-- CreateEnum
CREATE TYPE "SpendingCategory" AS ENUM ('REWARDS', 'SCREEN_TIME', 'SAVINGS', 'TRANSFER', 'OTHER');

-- AlterTable
ALTER TABLE "credit_transactions" ADD COLUMN     "category" "SpendingCategory" NOT NULL DEFAULT 'OTHER';

-- CreateTable
CREATE TABLE "allowance_schedules" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "frequency" "Frequency" NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "lastProcessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "allowance_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_goals" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetAmount" INTEGER NOT NULL,
    "currentAmount" INTEGER NOT NULL DEFAULT 0,
    "iconName" TEXT NOT NULL DEFAULT 'currency-dollar',
    "color" TEXT NOT NULL DEFAULT 'blue',
    "deadline" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "savings_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "category" "SpendingCategory" NOT NULL,
    "limitAmount" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "resetDay" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_periods" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "spent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "allowance_schedules_memberId_isActive_idx" ON "allowance_schedules"("memberId", "isActive");

-- CreateIndex
CREATE INDEX "allowance_schedules_isActive_isPaused_lastProcessedAt_idx" ON "allowance_schedules"("isActive", "isPaused", "lastProcessedAt");

-- CreateIndex
CREATE INDEX "savings_goals_memberId_isCompleted_idx" ON "savings_goals"("memberId", "isCompleted");

-- CreateIndex
CREATE INDEX "budgets_memberId_isActive_idx" ON "budgets"("memberId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_memberId_category_period_key" ON "budgets"("memberId", "category", "period");

-- CreateIndex
CREATE INDEX "budget_periods_budgetId_periodStart_idx" ON "budget_periods"("budgetId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "budget_periods_budgetId_periodKey_key" ON "budget_periods"("budgetId", "periodKey");

-- CreateIndex
CREATE INDEX "credit_transactions_memberId_createdAt_type_category_idx" ON "credit_transactions"("memberId", "createdAt", "type", "category");

-- AddForeignKey
ALTER TABLE "allowance_schedules" ADD CONSTRAINT "allowance_schedules_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_periods" ADD CONSTRAINT "budget_periods_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
