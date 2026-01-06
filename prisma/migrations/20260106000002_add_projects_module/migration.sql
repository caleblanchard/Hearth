-- CreateEnum: ProjectStatus (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProjectStatus') THEN
        CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');
    END IF;
END $$;

-- CreateEnum: TaskStatus (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaskStatus') THEN
        CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED');
    END IF;
END $$;

-- CreateEnum: DependencyType (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DependencyType') THEN
        CREATE TYPE "DependencyType" AS ENUM ('FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH');
    END IF;
END $$;

-- CreateTable: projects
CREATE TABLE IF NOT EXISTS "projects" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "budget" DOUBLE PRECISION,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable: project_tasks
CREATE TABLE IF NOT EXISTS "project_tasks" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "assigneeId" TEXT,
    "dueDate" TIMESTAMP(3),
    "estimatedHours" DOUBLE PRECISION,
    "actualHours" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: task_dependencies
CREATE TABLE IF NOT EXISTS "task_dependencies" (
    "id" TEXT NOT NULL,
    "dependentTaskId" TEXT NOT NULL,
    "blockingTaskId" TEXT NOT NULL,
    "dependencyType" "DependencyType" NOT NULL DEFAULT 'FINISH_TO_START',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "projects_familyId_status_idx" ON "projects"("familyId", "status");
CREATE INDEX IF NOT EXISTS "projects_createdAt_idx" ON "projects"("createdAt");
CREATE INDEX IF NOT EXISTS "project_tasks_projectId_sortOrder_idx" ON "project_tasks"("projectId", "sortOrder");
CREATE INDEX IF NOT EXISTS "project_tasks_assigneeId_idx" ON "project_tasks"("assigneeId");
CREATE INDEX IF NOT EXISTS "project_tasks_status_idx" ON "project_tasks"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "task_dependencies_dependentTaskId_blockingTaskId_key" ON "task_dependencies"("dependentTaskId", "blockingTaskId");
CREATE INDEX IF NOT EXISTS "task_dependencies_dependentTaskId_idx" ON "task_dependencies"("dependentTaskId");
CREATE INDEX IF NOT EXISTS "task_dependencies_blockingTaskId_idx" ON "task_dependencies"("blockingTaskId");

-- AddForeignKey
DO $$
BEGIN
    -- Foreign keys for projects
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'projects_familyId_fkey'
    ) THEN
        ALTER TABLE "projects" 
        ADD CONSTRAINT "projects_familyId_fkey" 
        FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'projects_createdById_fkey'
    ) THEN
        ALTER TABLE "projects" 
        ADD CONSTRAINT "projects_createdById_fkey" 
        FOREIGN KEY ("createdById") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Foreign keys for project_tasks
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'project_tasks_projectId_fkey'
    ) THEN
        ALTER TABLE "project_tasks" 
        ADD CONSTRAINT "project_tasks_projectId_fkey" 
        FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'project_tasks_assigneeId_fkey'
    ) THEN
        ALTER TABLE "project_tasks" 
        ADD CONSTRAINT "project_tasks_assigneeId_fkey" 
        FOREIGN KEY ("assigneeId") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- Foreign keys for task_dependencies
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'task_dependencies_dependentTaskId_fkey'
    ) THEN
        ALTER TABLE "task_dependencies" 
        ADD CONSTRAINT "task_dependencies_dependentTaskId_fkey" 
        FOREIGN KEY ("dependentTaskId") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'task_dependencies_blockingTaskId_fkey'
    ) THEN
        ALTER TABLE "task_dependencies" 
        ADD CONSTRAINT "task_dependencies_blockingTaskId_fkey" 
        FOREIGN KEY ("blockingTaskId") REFERENCES "project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
