-- Create MemberModuleAccess table for per-member module visibility
DO $$ 
BEGIN
  -- Create the table if it doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'member_module_access') THEN
    CREATE TABLE "member_module_access" (
      "id" TEXT NOT NULL,
      "memberId" TEXT NOT NULL,
      "moduleId" "ModuleId" NOT NULL,
      "hasAccess" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "member_module_access_pkey" PRIMARY KEY ("id")
    );

    -- Create unique constraint
    CREATE UNIQUE INDEX "member_module_access_memberId_moduleId_key" ON "member_module_access"("memberId", "moduleId");

    -- Create indexes
    CREATE INDEX "member_module_access_memberId_idx" ON "member_module_access"("memberId");
    CREATE INDEX "member_module_access_moduleId_idx" ON "member_module_access"("moduleId");

    -- Add foreign key constraint
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'member_module_access_memberId_fkey'
      ) THEN
        ALTER TABLE "member_module_access" 
        ADD CONSTRAINT "member_module_access_memberId_fkey" 
        FOREIGN KEY ("memberId") 
        REFERENCES "family_members"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
      END IF;
    END $$;
  END IF;
END $$;
