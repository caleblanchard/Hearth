-- CreateEnum
CREATE TYPE "HealthEventType" AS ENUM ('ILLNESS', 'INJURY', 'DOCTOR_VISIT', 'WELLNESS_CHECK', 'VACCINATION', 'OTHER');

-- CreateEnum
CREATE TYPE "SymptomType" AS ENUM ('FEVER', 'COUGH', 'SORE_THROAT', 'RUNNY_NOSE', 'HEADACHE', 'STOMACH_ACHE', 'VOMITING', 'DIARRHEA', 'RASH', 'FATIGUE', 'LOSS_OF_APPETITE', 'OTHER');

-- CreateEnum
CREATE TYPE "TempMethod" AS ENUM ('ORAL', 'RECTAL', 'ARMPIT', 'EAR', 'FOREHEAD');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'HEALTH_EVENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'HEALTH_EVENT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'HEALTH_EVENT_ENDED';
ALTER TYPE "AuditAction" ADD VALUE 'HEALTH_SYMPTOM_LOGGED';
ALTER TYPE "AuditAction" ADD VALUE 'HEALTH_MEDICATION_GIVEN';
ALTER TYPE "AuditAction" ADD VALUE 'TEMPERATURE_LOGGED';
ALTER TYPE "AuditAction" ADD VALUE 'MEDICAL_PROFILE_UPDATED';

-- CreateTable
CREATE TABLE "health_events" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "eventType" "HealthEventType" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "severity" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_symptoms" (
    "id" TEXT NOT NULL,
    "healthEventId" TEXT NOT NULL,
    "symptomType" "SymptomType" NOT NULL,
    "severity" INTEGER NOT NULL,
    "notes" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_symptoms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_medications" (
    "id" TEXT NOT NULL,
    "healthEventId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "givenAt" TIMESTAMP(3) NOT NULL,
    "givenBy" TEXT NOT NULL,
    "nextDoseAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "health_medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temperature_logs" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "method" "TempMethod" NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "temperature_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_profiles" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "bloodType" TEXT,
    "allergies" TEXT[],
    "conditions" TEXT[],
    "medications" TEXT[],
    "weight" DOUBLE PRECISION,
    "weightUnit" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "health_events_memberId_idx" ON "health_events"("memberId");

-- CreateIndex
CREATE INDEX "health_events_startedAt_idx" ON "health_events"("startedAt");

-- CreateIndex
CREATE INDEX "health_events_eventType_idx" ON "health_events"("eventType");

-- CreateIndex
CREATE INDEX "health_symptoms_healthEventId_idx" ON "health_symptoms"("healthEventId");

-- CreateIndex
CREATE INDEX "health_symptoms_recordedAt_idx" ON "health_symptoms"("recordedAt");

-- CreateIndex
CREATE INDEX "health_medications_healthEventId_idx" ON "health_medications"("healthEventId");

-- CreateIndex
CREATE INDEX "health_medications_givenAt_idx" ON "health_medications"("givenAt");

-- CreateIndex
CREATE INDEX "health_medications_nextDoseAt_idx" ON "health_medications"("nextDoseAt");

-- CreateIndex
CREATE INDEX "temperature_logs_memberId_idx" ON "temperature_logs"("memberId");

-- CreateIndex
CREATE INDEX "temperature_logs_recordedAt_idx" ON "temperature_logs"("recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "medical_profiles_memberId_key" ON "medical_profiles"("memberId");

-- AddForeignKey
ALTER TABLE "health_events" ADD CONSTRAINT "health_events_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_symptoms" ADD CONSTRAINT "health_symptoms_healthEventId_fkey" FOREIGN KEY ("healthEventId") REFERENCES "health_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_medications" ADD CONSTRAINT "health_medications_healthEventId_fkey" FOREIGN KEY ("healthEventId") REFERENCES "health_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temperature_logs" ADD CONSTRAINT "temperature_logs_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_profiles" ADD CONSTRAINT "medical_profiles_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
