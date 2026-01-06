-- CreateEnum: CalendarProvider (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CalendarProvider') THEN
        CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE', 'OUTLOOK', 'APPLE');
    END IF;
END $$;

-- CreateEnum: SyncStatus (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SyncStatus') THEN
        CREATE TYPE "SyncStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ERROR', 'DISCONNECTED');
    END IF;
END $$;

-- CreateEnum: SyncDirection (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SyncDirection') THEN
        CREATE TYPE "SyncDirection" AS ENUM ('IMPORT', 'EXPORT', 'BOTH');
    END IF;
END $$;

-- CreateTable: calendar_connections
CREATE TABLE IF NOT EXISTS "calendar_connections" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL DEFAULT 'GOOGLE',
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "googleCalendarId" TEXT,
    "googleEmail" TEXT,
    "syncToken" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "nextSyncAt" TIMESTAMP(3),
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'ACTIVE',
    "syncError" TEXT,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "importFromGoogle" BOOLEAN NOT NULL DEFAULT true,
    "exportToGoogle" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable: external_calendar_subscriptions
CREATE TABLE IF NOT EXISTS "external_calendar_subscriptions" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#9CA3AF',
    "lastSyncAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "nextSyncAt" TIMESTAMP(3),
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'ACTIVE',
    "syncError" TEXT,
    "etag" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "refreshInterval" INTEGER NOT NULL DEFAULT 1440,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_calendar_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: calendar_sync_logs
CREATE TABLE IF NOT EXISTS "calendar_sync_logs" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "calendarConnectionId" TEXT,
    "externalSubscriptionId" TEXT,
    "syncDirection" "SyncDirection" NOT NULL,
    "status" TEXT NOT NULL,
    "eventsAdded" INTEGER NOT NULL DEFAULT 0,
    "eventsUpdated" INTEGER NOT NULL DEFAULT 0,
    "eventsDeleted" INTEGER NOT NULL DEFAULT 0,
    "eventsSkipped" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "calendar_connections_memberId_idx" ON "calendar_connections"("memberId");
CREATE INDEX IF NOT EXISTS "calendar_connections_familyId_idx" ON "calendar_connections"("familyId");
CREATE INDEX IF NOT EXISTS "calendar_connections_syncStatus_nextSyncAt_idx" ON "calendar_connections"("syncStatus", "nextSyncAt");
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_connections_memberId_provider_key" ON "calendar_connections"("memberId", "provider");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "external_calendar_subscriptions_familyId_idx" ON "external_calendar_subscriptions"("familyId");
CREATE INDEX IF NOT EXISTS "external_calendar_subscriptions_isActive_nextSyncAt_idx" ON "external_calendar_subscriptions"("isActive", "nextSyncAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "calendar_sync_logs_familyId_createdAt_idx" ON "calendar_sync_logs"("familyId", "createdAt");
CREATE INDEX IF NOT EXISTS "calendar_sync_logs_calendarConnectionId_idx" ON "calendar_sync_logs"("calendarConnectionId");
CREATE INDEX IF NOT EXISTS "calendar_sync_logs_externalSubscriptionId_idx" ON "calendar_sync_logs"("externalSubscriptionId");

-- AddForeignKey
DO $$
BEGIN
    -- Add foreign keys for calendar_connections
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'calendar_connections_memberId_fkey'
    ) THEN
        ALTER TABLE "calendar_connections" 
        ADD CONSTRAINT "calendar_connections_memberId_fkey" 
        FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'calendar_connections_familyId_fkey'
    ) THEN
        ALTER TABLE "calendar_connections" 
        ADD CONSTRAINT "calendar_connections_familyId_fkey" 
        FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Add foreign keys for external_calendar_subscriptions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'external_calendar_subscriptions_familyId_fkey'
    ) THEN
        ALTER TABLE "external_calendar_subscriptions" 
        ADD CONSTRAINT "external_calendar_subscriptions_familyId_fkey" 
        FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Note: The createdById foreign key uses a named relation "SubscriptionCreator"
    -- This is handled by Prisma's relation system, but we still need the foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'external_calendar_subscriptions_createdById_fkey'
    ) THEN
        ALTER TABLE "external_calendar_subscriptions" 
        ADD CONSTRAINT "external_calendar_subscriptions_createdById_fkey" 
        FOREIGN KEY ("createdById") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Add foreign keys for calendar_sync_logs
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'calendar_sync_logs_familyId_fkey'
    ) THEN
        ALTER TABLE "calendar_sync_logs" 
        ADD CONSTRAINT "calendar_sync_logs_familyId_fkey" 
        FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'calendar_sync_logs_calendarConnectionId_fkey'
    ) THEN
        ALTER TABLE "calendar_sync_logs" 
        ADD CONSTRAINT "calendar_sync_logs_calendarConnectionId_fkey" 
        FOREIGN KEY ("calendarConnectionId") REFERENCES "calendar_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'calendar_sync_logs_externalSubscriptionId_fkey'
    ) THEN
        ALTER TABLE "calendar_sync_logs" 
        ADD CONSTRAINT "calendar_sync_logs_externalSubscriptionId_fkey" 
        FOREIGN KEY ("externalSubscriptionId") REFERENCES "external_calendar_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
