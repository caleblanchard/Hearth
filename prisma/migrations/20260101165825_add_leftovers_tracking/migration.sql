-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'LEFTOVER_LOGGED';
ALTER TYPE "AuditAction" ADD VALUE 'LEFTOVER_MARKED_USED';
ALTER TYPE "AuditAction" ADD VALUE 'LEFTOVER_MARKED_TOSSED';

-- CreateTable
CREATE TABLE "leftovers" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mealPlanEntryId" TEXT,
    "quantity" TEXT,
    "storedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "tossedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leftovers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leftovers_familyId_idx" ON "leftovers"("familyId");

-- CreateIndex
CREATE INDEX "leftovers_expiresAt_idx" ON "leftovers"("expiresAt");

-- CreateIndex
CREATE INDEX "leftovers_familyId_usedAt_tossedAt_idx" ON "leftovers"("familyId", "usedAt", "tossedAt");

-- AddForeignKey
ALTER TABLE "leftovers" ADD CONSTRAINT "leftovers_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leftovers" ADD CONSTRAINT "leftovers_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
