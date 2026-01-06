-- AlterTable: Add missing columns to calendar_events
-- Using DO block to check if columns exist first (PostgreSQL doesn't support IF NOT EXISTS for ADD COLUMN in all versions)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'projectId') THEN
        ALTER TABLE "calendar_events" ADD COLUMN "projectId" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'calendarConnectionId') THEN
        ALTER TABLE "calendar_events" ADD COLUMN "calendarConnectionId" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'externalSubscriptionId') THEN
        ALTER TABLE "calendar_events" ADD COLUMN "externalSubscriptionId" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'googleEventId') THEN
        ALTER TABLE "calendar_events" ADD COLUMN "googleEventId" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'lastSyncedAt') THEN
        ALTER TABLE "calendar_events" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calendar_events' AND column_name = 'syncHash') THEN
        ALTER TABLE "calendar_events" ADD COLUMN "syncHash" TEXT;
    END IF;
END $$;

-- CreateIndex: Add indexes for the new columns (only if they don't exist)
CREATE INDEX IF NOT EXISTS "calendar_events_projectId_idx" ON "calendar_events"("projectId");
CREATE INDEX IF NOT EXISTS "calendar_events_googleEventId_idx" ON "calendar_events"("googleEventId");
CREATE INDEX IF NOT EXISTS "calendar_events_calendarConnectionId_idx" ON "calendar_events"("calendarConnectionId");
CREATE INDEX IF NOT EXISTS "calendar_events_externalSubscriptionId_idx" ON "calendar_events"("externalSubscriptionId");
CREATE INDEX IF NOT EXISTS "calendar_events_syncHash_idx" ON "calendar_events"("syncHash");

-- AddForeignKey: Add foreign keys only if the referenced tables exist
DO $$
BEGIN
    -- Add projectId foreign key if projects table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'calendar_events_projectId_fkey'
        ) THEN
            ALTER TABLE "calendar_events" 
            ADD CONSTRAINT "calendar_events_projectId_fkey" 
            FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;

    -- Add calendarConnectionId foreign key if calendar_connections table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_connections') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'calendar_events_calendarConnectionId_fkey'
        ) THEN
            ALTER TABLE "calendar_events" 
            ADD CONSTRAINT "calendar_events_calendarConnectionId_fkey" 
            FOREIGN KEY ("calendarConnectionId") REFERENCES "calendar_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;

    -- Add externalSubscriptionId foreign key if external_calendar_subscriptions table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'external_calendar_subscriptions') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'calendar_events_externalSubscriptionId_fkey'
        ) THEN
            ALTER TABLE "calendar_events" 
            ADD CONSTRAINT "calendar_events_externalSubscriptionId_fkey" 
            FOREIGN KEY ("externalSubscriptionId") REFERENCES "external_calendar_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;
