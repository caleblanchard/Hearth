-- CreateEnum
CREATE TYPE "RoutineType" AS ENUM ('MORNING', 'BEDTIME', 'HOMEWORK', 'AFTER_SCHOOL', 'CUSTOM');

-- CreateTable
CREATE TABLE "routines" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RoutineType" NOT NULL,
    "isWeekday" BOOLEAN NOT NULL DEFAULT true,
    "isWeekend" BOOLEAN NOT NULL DEFAULT true,
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_steps" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "estimatedMinutes" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "routine_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_completions" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routine_completions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "routines_familyId_assignedTo_idx" ON "routines"("familyId", "assignedTo");

-- CreateIndex
CREATE INDEX "routine_steps_routineId_sortOrder_idx" ON "routine_steps"("routineId", "sortOrder");

-- CreateIndex
CREATE INDEX "routine_completions_memberId_date_idx" ON "routine_completions"("memberId", "date");

-- CreateIndex
CREATE INDEX "routine_completions_routineId_date_idx" ON "routine_completions"("routineId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "routine_completions_routineId_memberId_date_key" ON "routine_completions"("routineId", "memberId", "date");

-- AddForeignKey
ALTER TABLE "routines" ADD CONSTRAINT "routines_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routines" ADD CONSTRAINT "routines_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_steps" ADD CONSTRAINT "routine_steps_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_completions" ADD CONSTRAINT "routine_completions_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_completions" ADD CONSTRAINT "routine_completions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
