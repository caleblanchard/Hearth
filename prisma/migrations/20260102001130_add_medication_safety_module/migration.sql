-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'MEDICATION_SAFETY_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'MEDICATION_DOSE_LOGGED';
ALTER TYPE "AuditAction" ADD VALUE 'MEDICATION_DOSE_OVERRIDE';
ALTER TYPE "AuditAction" ADD VALUE 'MEDICATION_SAFETY_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'MEDICATION_SAFETY_DELETED';

-- CreateTable
CREATE TABLE "medication_safety" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "activeIngredient" TEXT,
    "minIntervalHours" INTEGER NOT NULL,
    "maxDosesPerDay" INTEGER,
    "lastDoseAt" TIMESTAMP(3),
    "nextDoseAvailableAt" TIMESTAMP(3),
    "notifyWhenReady" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medication_safety_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_doses" (
    "id" TEXT NOT NULL,
    "medicationSafetyId" TEXT NOT NULL,
    "givenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "givenBy" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "notes" TEXT,
    "wasOverride" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "overrideApprovedBy" TEXT,

    CONSTRAINT "medication_doses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medication_safety_memberId_idx" ON "medication_safety"("memberId");

-- CreateIndex
CREATE INDEX "medication_safety_nextDoseAvailableAt_idx" ON "medication_safety"("nextDoseAvailableAt");

-- CreateIndex
CREATE INDEX "medication_doses_medicationSafetyId_idx" ON "medication_doses"("medicationSafetyId");

-- CreateIndex
CREATE INDEX "medication_doses_givenAt_idx" ON "medication_doses"("givenAt");

-- AddForeignKey
ALTER TABLE "medication_safety" ADD CONSTRAINT "medication_safety_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_doses" ADD CONSTRAINT "medication_doses_medicationSafetyId_fkey" FOREIGN KEY ("medicationSafetyId") REFERENCES "medication_safety"("id") ON DELETE CASCADE ON UPDATE CASCADE;
