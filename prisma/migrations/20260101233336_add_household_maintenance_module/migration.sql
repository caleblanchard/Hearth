-- CreateEnum
CREATE TYPE "MaintenanceCategory" AS ENUM ('HVAC', 'PLUMBING', 'ELECTRICAL', 'EXTERIOR', 'INTERIOR', 'LAWN_GARDEN', 'APPLIANCES', 'SAFETY', 'SEASONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "Season" AS ENUM ('SPRING', 'SUMMER', 'FALL', 'WINTER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'MAINTENANCE_ITEM_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'MAINTENANCE_ITEM_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'MAINTENANCE_ITEM_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'MAINTENANCE_TASK_COMPLETED';

-- CreateTable
CREATE TABLE "maintenance_items" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "MaintenanceCategory" NOT NULL,
    "frequency" TEXT NOT NULL,
    "season" "Season",
    "lastCompletedAt" TIMESTAMP(3),
    "nextDueAt" TIMESTAMP(3),
    "estimatedCost" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_completions" (
    "id" TEXT NOT NULL,
    "maintenanceItemId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedBy" TEXT NOT NULL,
    "cost" DOUBLE PRECISION,
    "serviceProvider" TEXT,
    "notes" TEXT,
    "photoUrls" TEXT[],

    CONSTRAINT "maintenance_completions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "maintenance_items_familyId_idx" ON "maintenance_items"("familyId");

-- CreateIndex
CREATE INDEX "maintenance_items_nextDueAt_idx" ON "maintenance_items"("nextDueAt");

-- CreateIndex
CREATE INDEX "maintenance_items_category_idx" ON "maintenance_items"("category");

-- CreateIndex
CREATE INDEX "maintenance_completions_maintenanceItemId_idx" ON "maintenance_completions"("maintenanceItemId");

-- CreateIndex
CREATE INDEX "maintenance_completions_completedAt_idx" ON "maintenance_completions"("completedAt");

-- AddForeignKey
ALTER TABLE "maintenance_items" ADD CONSTRAINT "maintenance_items_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_completions" ADD CONSTRAINT "maintenance_completions_maintenanceItemId_fkey" FOREIGN KEY ("maintenanceItemId") REFERENCES "maintenance_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_completions" ADD CONSTRAINT "maintenance_completions_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
