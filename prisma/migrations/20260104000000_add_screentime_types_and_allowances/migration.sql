-- CreateEnum
CREATE TYPE "ScreenTimePeriod" AS ENUM ('DAILY', 'WEEKLY');

-- CreateTable
CREATE TABLE "screen_time_types" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "screen_time_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screen_time_allowances" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "screenTimeTypeId" TEXT NOT NULL,
    "allowanceMinutes" INTEGER NOT NULL,
    "period" "ScreenTimePeriod" NOT NULL DEFAULT 'WEEKLY',
    "rolloverEnabled" BOOLEAN NOT NULL DEFAULT false,
    "rolloverCapMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "screen_time_allowances_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "screen_time_transactions" ADD COLUMN "screenTimeTypeId" TEXT,
ADD COLUMN "wasOverride" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "overrideReason" TEXT;

-- CreateIndex
CREATE INDEX "screen_time_types_familyId_isActive_isArchived_idx" ON "screen_time_types"("familyId", "isActive", "isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "screen_time_allowances_memberId_screenTimeTypeId_key" ON "screen_time_allowances"("memberId", "screenTimeTypeId");

-- CreateIndex
CREATE INDEX "screen_time_allowances_memberId_idx" ON "screen_time_allowances"("memberId");

-- CreateIndex
CREATE INDEX "screen_time_allowances_screenTimeTypeId_idx" ON "screen_time_allowances"("screenTimeTypeId");

-- CreateIndex
CREATE INDEX "screen_time_transactions_screenTimeTypeId_idx" ON "screen_time_transactions"("screenTimeTypeId");

-- AddForeignKey
ALTER TABLE "screen_time_types" ADD CONSTRAINT "screen_time_types_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screen_time_allowances" ADD CONSTRAINT "screen_time_allowances_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screen_time_allowances" ADD CONSTRAINT "screen_time_allowances_screenTimeTypeId_fkey" FOREIGN KEY ("screenTimeTypeId") REFERENCES "screen_time_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screen_time_transactions" ADD CONSTRAINT "screen_time_transactions_screenTimeTypeId_fkey" FOREIGN KEY ("screenTimeTypeId") REFERENCES "screen_time_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
