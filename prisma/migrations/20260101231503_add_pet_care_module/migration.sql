-- CreateEnum
CREATE TYPE "PetSpecies" AS ENUM ('DOG', 'CAT', 'BIRD', 'FISH', 'HAMSTER', 'RABBIT', 'GUINEA_PIG', 'REPTILE', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PET_ADDED';
ALTER TYPE "AuditAction" ADD VALUE 'PET_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PET_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'PET_FED';
ALTER TYPE "AuditAction" ADD VALUE 'PET_MEDICATION_GIVEN';
ALTER TYPE "AuditAction" ADD VALUE 'PET_VET_VISIT_LOGGED';
ALTER TYPE "AuditAction" ADD VALUE 'PET_WEIGHT_LOGGED';

-- CreateTable
CREATE TABLE "pets" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" "PetSpecies" NOT NULL,
    "breed" TEXT,
    "birthday" TIMESTAMP(3),
    "imageUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_feedings" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "fedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fedBy" TEXT NOT NULL,
    "foodType" TEXT,
    "amount" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_feedings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_medications" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "minIntervalHours" INTEGER,
    "lastGivenAt" TIMESTAMP(3),
    "lastGivenBy" TEXT,
    "nextDoseAt" TIMESTAMP(3),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pet_medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_medication_doses" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "givenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "givenBy" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_medication_doses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_vet_visits" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "diagnosis" TEXT,
    "treatment" TEXT,
    "cost" DOUBLE PRECISION,
    "nextVisit" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pet_vet_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_weights" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "pet_weights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pets_familyId_idx" ON "pets"("familyId");

-- CreateIndex
CREATE INDEX "pet_feedings_petId_idx" ON "pet_feedings"("petId");

-- CreateIndex
CREATE INDEX "pet_feedings_fedAt_idx" ON "pet_feedings"("fedAt");

-- CreateIndex
CREATE INDEX "pet_medications_petId_idx" ON "pet_medications"("petId");

-- CreateIndex
CREATE INDEX "pet_medications_nextDoseAt_idx" ON "pet_medications"("nextDoseAt");

-- CreateIndex
CREATE INDEX "pet_medication_doses_medicationId_idx" ON "pet_medication_doses"("medicationId");

-- CreateIndex
CREATE INDEX "pet_medication_doses_givenAt_idx" ON "pet_medication_doses"("givenAt");

-- CreateIndex
CREATE INDEX "pet_vet_visits_petId_idx" ON "pet_vet_visits"("petId");

-- CreateIndex
CREATE INDEX "pet_vet_visits_visitDate_idx" ON "pet_vet_visits"("visitDate");

-- CreateIndex
CREATE INDEX "pet_weights_petId_idx" ON "pet_weights"("petId");

-- CreateIndex
CREATE INDEX "pet_weights_recordedAt_idx" ON "pet_weights"("recordedAt");

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_feedings" ADD CONSTRAINT "pet_feedings_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_feedings" ADD CONSTRAINT "pet_feedings_fedBy_fkey" FOREIGN KEY ("fedBy") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_medications" ADD CONSTRAINT "pet_medications_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_medication_doses" ADD CONSTRAINT "pet_medication_doses_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "pet_medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_vet_visits" ADD CONSTRAINT "pet_vet_visits_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_weights" ADD CONSTRAINT "pet_weights_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
