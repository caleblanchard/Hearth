-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'RULE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'RULE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'RULE_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'RULE_ENABLED';
ALTER TYPE "AuditAction" ADD VALUE 'RULE_DISABLED';
ALTER TYPE "AuditAction" ADD VALUE 'RULE_EXECUTED';
ALTER TYPE "AuditAction" ADD VALUE 'RULE_TEST_RUN';

-- AlterEnum
ALTER TYPE "ModuleId" ADD VALUE 'RULES_ENGINE';

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" JSONB NOT NULL,
    "conditions" JSONB,
    "actions" JSONB NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_executions" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "metadata" JSONB,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rule_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "automation_rules_familyId_isEnabled_idx" ON "automation_rules"("familyId", "isEnabled");

-- CreateIndex
CREATE INDEX "automation_rules_createdAt_idx" ON "automation_rules"("createdAt");

-- CreateIndex
CREATE INDEX "rule_executions_ruleId_executedAt_idx" ON "rule_executions"("ruleId", "executedAt");

-- CreateIndex
CREATE INDEX "rule_executions_success_executedAt_idx" ON "rule_executions"("success", "executedAt");

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_executions" ADD CONSTRAINT "rule_executions_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "automation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
