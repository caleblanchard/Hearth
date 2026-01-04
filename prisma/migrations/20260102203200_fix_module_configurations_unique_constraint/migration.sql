-- Drop the incorrect unique index on moduleId only
DROP INDEX IF EXISTS "module_configurations_moduleId_key";

-- Drop the regular index on (familyId, moduleId) if it exists
DROP INDEX IF EXISTS "module_configurations_familyId_moduleId_idx";

-- Create the correct unique constraint on (familyId, moduleId)
CREATE UNIQUE INDEX "module_configurations_familyId_moduleId_key" ON "module_configurations"("familyId", "moduleId");
