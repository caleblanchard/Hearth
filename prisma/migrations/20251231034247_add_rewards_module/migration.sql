-- CreateEnum
CREATE TYPE "RewardCategory" AS ENUM ('PRIVILEGE', 'ITEM', 'EXPERIENCE', 'SCREEN_TIME', 'OTHER');

-- CreateEnum
CREATE TYPE "RewardStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'SHOPPING_ITEM_ADDED';
ALTER TYPE "AuditAction" ADD VALUE 'SHOPPING_ITEM_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'SHOPPING_ITEM_DELETED';

-- CreateTable
CREATE TABLE "reward_items" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "RewardCategory" NOT NULL DEFAULT 'OTHER',
    "costCredits" INTEGER NOT NULL,
    "quantity" INTEGER,
    "imageUrl" TEXT,
    "status" "RewardStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_redemptions" (
    "id" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "creditTransactionId" TEXT,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectionReason" TEXT,
    "fulfilledAt" TIMESTAMP(3),
    "fulfilledById" TEXT,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reward_items_familyId_status_idx" ON "reward_items"("familyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "reward_redemptions_creditTransactionId_key" ON "reward_redemptions"("creditTransactionId");

-- CreateIndex
CREATE INDEX "reward_redemptions_memberId_status_idx" ON "reward_redemptions"("memberId", "status");

-- CreateIndex
CREATE INDEX "reward_redemptions_status_requestedAt_idx" ON "reward_redemptions"("status", "requestedAt");

-- AddForeignKey
ALTER TABLE "reward_items" ADD CONSTRAINT "reward_items_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_items" ADD CONSTRAINT "reward_items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "reward_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_creditTransactionId_fkey" FOREIGN KEY ("creditTransactionId") REFERENCES "credit_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_fulfilledById_fkey" FOREIGN KEY ("fulfilledById") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
