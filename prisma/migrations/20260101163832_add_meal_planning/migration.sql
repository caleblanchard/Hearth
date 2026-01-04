-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'MEAL_PLAN_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'MEAL_ENTRY_ADDED';
ALTER TYPE "AuditAction" ADD VALUE 'MEAL_ENTRY_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'MEAL_ENTRY_DELETED';

-- CreateTable
CREATE TABLE "meal_plans" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plan_entries" (
    "id" TEXT NOT NULL,
    "mealPlanId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mealType" "MealType" NOT NULL,
    "recipeId" TEXT,
    "customName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_plan_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meal_plans_familyId_idx" ON "meal_plans"("familyId");

-- CreateIndex
CREATE INDEX "meal_plans_weekStart_idx" ON "meal_plans"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "meal_plans_familyId_weekStart_key" ON "meal_plans"("familyId", "weekStart");

-- CreateIndex
CREATE INDEX "meal_plan_entries_mealPlanId_idx" ON "meal_plan_entries"("mealPlanId");

-- CreateIndex
CREATE INDEX "meal_plan_entries_date_idx" ON "meal_plan_entries"("date");

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plan_entries" ADD CONSTRAINT "meal_plan_entries_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
