-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'KIOSK_SESSION_STARTED';
ALTER TYPE "AuditAction" ADD VALUE 'KIOSK_SESSION_ENDED';
ALTER TYPE "AuditAction" ADD VALUE 'KIOSK_MEMBER_SWITCHED';
ALTER TYPE "AuditAction" ADD VALUE 'KIOSK_AUTO_LOCKED';
ALTER TYPE "AuditAction" ADD VALUE 'KIOSK_SETTINGS_UPDATED';

-- CreateTable
CREATE TABLE "kiosk_sessions" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currentMemberId" TEXT,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autoLockMinutes" INTEGER NOT NULL DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kiosk_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kiosk_settings" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoLockMinutes" INTEGER NOT NULL DEFAULT 15,
    "enabledWidgets" TEXT[],
    "allowGuestView" BOOLEAN NOT NULL DEFAULT true,
    "requirePinForSwitch" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kiosk_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kiosk_sessions_deviceId_key" ON "kiosk_sessions"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "kiosk_sessions_sessionToken_key" ON "kiosk_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "kiosk_sessions_familyId_idx" ON "kiosk_sessions"("familyId");

-- CreateIndex
CREATE INDEX "kiosk_sessions_deviceId_idx" ON "kiosk_sessions"("deviceId");

-- CreateIndex
CREATE INDEX "kiosk_sessions_sessionToken_idx" ON "kiosk_sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "kiosk_settings_familyId_key" ON "kiosk_settings"("familyId");

-- AddForeignKey
ALTER TABLE "kiosk_sessions" ADD CONSTRAINT "kiosk_sessions_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiosk_sessions" ADD CONSTRAINT "kiosk_sessions_currentMemberId_fkey" FOREIGN KEY ("currentMemberId") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiosk_settings" ADD CONSTRAINT "kiosk_settings_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
