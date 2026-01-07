-- CreateEnum
CREATE TYPE "SickModeTrigger" AS ENUM ('MANUAL', 'AUTO_FROM_HEALTH_EVENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'SICK_MODE_STARTED';
ALTER TYPE "AuditAction" ADD VALUE 'SICK_MODE_ENDED';
ALTER TYPE "AuditAction" ADD VALUE 'SICK_MODE_SETTINGS_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'SICK_MODE_AUTO_TRIGGERED';
ALTER TYPE "AuditAction" ADD VALUE 'PROJECT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PROJECT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PROJECT_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'PROJECT_STATUS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'PROJECT_TASK_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PROJECT_TASK_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PROJECT_TASK_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'PROJECT_TASK_STATUS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'PROJECT_DEPENDENCY_ADDED';
ALTER TYPE "AuditAction" ADD VALUE 'PROJECT_DEPENDENCY_REMOVED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'LEFTOVER_EXPIRING';
ALTER TYPE "NotificationType" ADD VALUE 'DOCUMENT_EXPIRING';
ALTER TYPE "NotificationType" ADD VALUE 'MEDICATION_AVAILABLE';
ALTER TYPE "NotificationType" ADD VALUE 'ROUTINE_TIME';
ALTER TYPE "NotificationType" ADD VALUE 'MAINTENANCE_DUE';
ALTER TYPE "NotificationType" ADD VALUE 'PET_CARE_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'CARPOOL_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'SAVINGS_GOAL_ACHIEVED';
ALTER TYPE "NotificationType" ADD VALUE 'BUSY_DAY_ALERT';
ALTER TYPE "NotificationType" ADD VALUE 'RULE_TRIGGERED';

-- AlterTable
ALTER TABLE "document_access_logs" ADD COLUMN     "userAgent" TEXT,
ADD COLUMN     "viaShareLink" TEXT,
ALTER COLUMN "accessedBy" DROP NOT NULL;

-- AlterTable
ALTER TABLE "document_share_links" ADD COLUMN     "lastAccessedAt" TIMESTAMP(3),
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "revokedBy" TEXT;

-- AlterTable
ALTER TABLE "recipe_ingredients" ALTER COLUMN "quantity" DROP NOT NULL,
ALTER COLUMN "unit" DROP NOT NULL;

-- AlterTable
ALTER TABLE "shopping_items" ADD COLUMN     "projectId" TEXT;

-- CreateTable
CREATE TABLE "member_module_access" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "moduleId" "ModuleId" NOT NULL,
    "hasAccess" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_module_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabledTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "leftoverExpiringHours" INTEGER NOT NULL DEFAULT 24,
    "documentExpiringDays" INTEGER NOT NULL DEFAULT 90,
    "carpoolReminderMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plan_dishes" (
    "id" TEXT NOT NULL,
    "mealEntryId" TEXT NOT NULL,
    "recipeId" TEXT,
    "dishName" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_plan_dishes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sick_mode_instances" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "endedById" TEXT,
    "triggeredBy" "SickModeTrigger" NOT NULL,
    "healthEventId" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sick_mode_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sick_mode_settings" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "autoEnableOnTemperature" BOOLEAN NOT NULL DEFAULT true,
    "temperatureThreshold" DECIMAL(65,30) NOT NULL DEFAULT 100.4,
    "autoDisableAfter24Hours" BOOLEAN NOT NULL DEFAULT false,
    "pauseChores" BOOLEAN NOT NULL DEFAULT true,
    "pauseScreenTimeTracking" BOOLEAN NOT NULL DEFAULT true,
    "screenTimeBonus" INTEGER NOT NULL DEFAULT 120,
    "skipMorningRoutine" BOOLEAN NOT NULL DEFAULT true,
    "skipBedtimeRoutine" BOOLEAN NOT NULL DEFAULT false,
    "muteNonEssentialNotifs" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sick_mode_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "member_module_access_memberId_moduleId_key" ON "member_module_access"("memberId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");

-- CreateIndex
CREATE INDEX "meal_plan_dishes_mealEntryId_idx" ON "meal_plan_dishes"("mealEntryId");

-- CreateIndex
CREATE INDEX "meal_plan_dishes_recipeId_idx" ON "meal_plan_dishes"("recipeId");

-- CreateIndex
CREATE INDEX "sick_mode_instances_familyId_isActive_idx" ON "sick_mode_instances"("familyId", "isActive");

-- CreateIndex
CREATE INDEX "sick_mode_instances_memberId_isActive_idx" ON "sick_mode_instances"("memberId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "sick_mode_settings_familyId_key" ON "sick_mode_settings"("familyId");

-- CreateIndex
CREATE INDEX "shopping_items_projectId_idx" ON "shopping_items"("projectId");

-- AddForeignKey
ALTER TABLE "member_module_access" ADD CONSTRAINT "member_module_access_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_calendarConnectionId_fkey" FOREIGN KEY ("calendarConnectionId") REFERENCES "calendar_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_externalSubscriptionId_fkey" FOREIGN KEY ("externalSubscriptionId") REFERENCES "external_calendar_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plan_dishes" ADD CONSTRAINT "meal_plan_dishes_mealEntryId_fkey" FOREIGN KEY ("mealEntryId") REFERENCES "meal_plan_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plan_dishes" ADD CONSTRAINT "meal_plan_dishes_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sick_mode_instances" ADD CONSTRAINT "sick_mode_instances_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sick_mode_instances" ADD CONSTRAINT "sick_mode_instances_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sick_mode_instances" ADD CONSTRAINT "sick_mode_instances_endedById_fkey" FOREIGN KEY ("endedById") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sick_mode_instances" ADD CONSTRAINT "sick_mode_instances_healthEventId_fkey" FOREIGN KEY ("healthEventId") REFERENCES "health_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sick_mode_settings" ADD CONSTRAINT "sick_mode_settings_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
