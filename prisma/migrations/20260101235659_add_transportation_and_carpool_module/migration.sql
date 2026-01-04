-- CreateEnum
CREATE TYPE "TransportType" AS ENUM ('PICKUP', 'DROPOFF');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'TRANSPORT_SCHEDULE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'TRANSPORT_SCHEDULE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'TRANSPORT_SCHEDULE_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'TRANSPORT_LOCATION_ADDED';
ALTER TYPE "AuditAction" ADD VALUE 'TRANSPORT_DRIVER_ADDED';
ALTER TYPE "AuditAction" ADD VALUE 'CARPOOL_GROUP_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CARPOOL_MEMBER_ADDED';
ALTER TYPE "AuditAction" ADD VALUE 'TRANSPORT_CONFIRMED';

-- CreateTable
CREATE TABLE "transport_schedules" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "time" TEXT NOT NULL,
    "type" "TransportType" NOT NULL,
    "locationId" TEXT,
    "driverId" TEXT,
    "carpoolId" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_locations" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_drivers" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "relationship" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carpool_groups" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carpool_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carpool_members" (
    "id" TEXT NOT NULL,
    "carpoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carpool_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transport_schedules_familyId_idx" ON "transport_schedules"("familyId");

-- CreateIndex
CREATE INDEX "transport_schedules_memberId_idx" ON "transport_schedules"("memberId");

-- CreateIndex
CREATE INDEX "transport_schedules_dayOfWeek_idx" ON "transport_schedules"("dayOfWeek");

-- CreateIndex
CREATE INDEX "transport_locations_familyId_idx" ON "transport_locations"("familyId");

-- CreateIndex
CREATE INDEX "transport_drivers_familyId_idx" ON "transport_drivers"("familyId");

-- CreateIndex
CREATE INDEX "carpool_groups_familyId_idx" ON "carpool_groups"("familyId");

-- CreateIndex
CREATE INDEX "carpool_members_carpoolId_idx" ON "carpool_members"("carpoolId");

-- AddForeignKey
ALTER TABLE "transport_schedules" ADD CONSTRAINT "transport_schedules_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_schedules" ADD CONSTRAINT "transport_schedules_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_schedules" ADD CONSTRAINT "transport_schedules_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "transport_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_schedules" ADD CONSTRAINT "transport_schedules_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "transport_drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_schedules" ADD CONSTRAINT "transport_schedules_carpoolId_fkey" FOREIGN KEY ("carpoolId") REFERENCES "carpool_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_locations" ADD CONSTRAINT "transport_locations_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_drivers" ADD CONSTRAINT "transport_drivers_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpool_groups" ADD CONSTRAINT "carpool_groups_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpool_members" ADD CONSTRAINT "carpool_members_carpoolId_fkey" FOREIGN KEY ("carpoolId") REFERENCES "carpool_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
