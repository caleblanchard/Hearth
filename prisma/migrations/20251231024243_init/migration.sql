-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PARENT', 'CHILD', 'GUEST');

-- CreateEnum
CREATE TYPE "ModuleId" AS ENUM ('CHORES', 'SCREEN_TIME', 'CREDITS', 'SHOPPING', 'CALENDAR', 'TODOS', 'ROUTINES', 'MEAL_PLANNING', 'RECIPES', 'INVENTORY', 'HEALTH', 'PROJECTS', 'COMMUNICATION', 'TRANSPORT', 'PETS', 'MAINTENANCE', 'DOCUMENTS');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('FIXED', 'ROTATING', 'OPT_IN');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ChoreStatus" AS ENUM ('PENDING', 'COMPLETED', 'APPROVED', 'REJECTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "RolloverType" AS ENUM ('NONE', 'FULL', 'CAPPED');

-- CreateEnum
CREATE TYPE "ResetDay" AS ENUM ('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');

-- CreateEnum
CREATE TYPE "ScreenTimeTransactionType" AS ENUM ('ALLOCATION', 'EARNED', 'SPENT', 'ADJUSTMENT', 'ROLLOVER', 'GRACE_BORROWED', 'GRACE_REPAID');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('TV', 'TABLET', 'PHONE', 'COMPUTER', 'GAMING', 'OTHER');

-- CreateEnum
CREATE TYPE "GraceRepaymentMode" AS ENUM ('DEDUCT_NEXT_WEEK', 'EARN_BACK', 'FORGIVE');

-- CreateEnum
CREATE TYPE "RepaymentStatus" AS ENUM ('PENDING', 'DEDUCTED', 'EARNED_BACK', 'FORGIVEN');

-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('CHORE_REWARD', 'BONUS', 'SCREENTIME_PURCHASE', 'REWARD_REDEMPTION', 'ADJUSTMENT', 'TRANSFER');

-- CreateEnum
CREATE TYPE "TodoPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TodoStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShoppingPriority" AS ENUM ('NORMAL', 'NEEDED_SOON', 'URGENT');

-- CreateEnum
CREATE TYPE "ShoppingStatus" AS ENUM ('PENDING', 'IN_CART', 'PURCHASED', 'REMOVED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('INTERNAL', 'GOOGLE', 'OUTLOOK', 'APPLE');

-- CreateEnum
CREATE TYPE "GuestAccessLevel" AS ENUM ('VIEW_ONLY', 'LIMITED', 'CAREGIVER');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('AVATAR', 'CHORE_PROOF', 'BOARD_IMAGE', 'PET_PHOTO', 'MAINTENANCE_PHOTO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('LOCAL', 'S3', 'CLOUDFLARE');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'PIN_CHANGE', 'SESSION_EXPIRED', 'MEMBER_ADDED', 'MEMBER_REMOVED', 'MEMBER_UPDATED', 'ROLE_CHANGED', 'CHORE_COMPLETED', 'CHORE_APPROVED', 'CHORE_REJECTED', 'CHORE_ASSIGNED', 'CREDITS_AWARDED', 'CREDITS_DEDUCTED', 'REWARD_REDEEMED', 'REWARD_APPROVED', 'SCREENTIME_LOGGED', 'SCREENTIME_ADJUSTED', 'GRACE_PERIOD_USED', 'SETTINGS_CHANGED', 'MODULE_ENABLED', 'MODULE_DISABLED', 'RATE_LIMIT_HIT', 'AUTH_DENIED', 'SUSPICIOUS_ACTIVITY');

-- CreateEnum
CREATE TYPE "AuditResult" AS ENUM ('SUCCESS', 'FAILURE', 'DENIED');

-- CreateTable
CREATE TABLE "families" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "settings" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_members" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "pin" TEXT,
    "role" "Role" NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_configurations" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "moduleId" "ModuleId" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "enabledAt" TIMESTAMP(3),
    "disabledAt" TIMESTAMP(3),
    "settings" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chore_definitions" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "estimatedMinutes" INTEGER NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "creditValue" INTEGER NOT NULL DEFAULT 0,
    "minimumAge" INTEGER,
    "iconName" TEXT NOT NULL DEFAULT 'task',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chore_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chore_schedules" (
    "id" TEXT NOT NULL,
    "choreDefinitionId" TEXT NOT NULL,
    "assignmentType" "AssignmentType" NOT NULL,
    "frequency" "Frequency" NOT NULL,
    "customCron" TEXT,
    "dayOfWeek" INTEGER,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "requiresPhoto" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chore_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chore_assignments" (
    "id" TEXT NOT NULL,
    "choreScheduleId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "rotationOrder" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chore_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chore_instances" (
    "id" TEXT NOT NULL,
    "choreScheduleId" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "ChoreStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "photoUrl" TEXT,
    "notes" TEXT,
    "creditsAwarded" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chore_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screen_time_settings" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "weeklyAllocationMinutes" INTEGER NOT NULL,
    "resetDay" "ResetDay" NOT NULL DEFAULT 'SUNDAY',
    "rolloverType" "RolloverType" NOT NULL DEFAULT 'NONE',
    "rolloverCapMinutes" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "screen_time_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screen_time_balances" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "currentBalanceMinutes" INTEGER NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "screen_time_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screen_time_transactions" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "ScreenTimeTransactionType" NOT NULL,
    "amountMinutes" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "deviceType" "DeviceType",
    "reason" TEXT,
    "relatedChoreInstanceId" TEXT,
    "createdById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screen_time_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screen_time_grace_settings" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "gracePeriodMinutes" INTEGER NOT NULL DEFAULT 15,
    "maxGracePerDay" INTEGER NOT NULL DEFAULT 1,
    "maxGracePerWeek" INTEGER NOT NULL DEFAULT 3,
    "graceRepaymentMode" "GraceRepaymentMode" NOT NULL DEFAULT 'DEDUCT_NEXT_WEEK',
    "lowBalanceWarningMinutes" INTEGER NOT NULL DEFAULT 10,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "screen_time_grace_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grace_period_logs" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "minutesGranted" INTEGER NOT NULL,
    "reason" TEXT,
    "approvedById" TEXT,
    "repaymentStatus" "RepaymentStatus" NOT NULL DEFAULT 'PENDING',
    "repaidAt" TIMESTAMP(3),
    "relatedTransactionId" TEXT,

    CONSTRAINT "grace_period_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_balances" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "currentBalance" INTEGER NOT NULL DEFAULT 0,
    "lifetimeEarned" INTEGER NOT NULL DEFAULT 0,
    "lifetimeSpent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT,
    "relatedChoreInstanceId" TEXT,
    "adjustedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "todo_items" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "dueDate" TIMESTAMP(3),
    "priority" "TodoPriority" NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "status" "TodoStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "todo_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_lists" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopping_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_items" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT,
    "category" TEXT,
    "priority" "ShoppingPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "ShoppingStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "purchasedById" TEXT,
    "purchasedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopping_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "eventType" "EventType" NOT NULL DEFAULT 'INTERNAL',
    "externalId" TEXT,
    "color" TEXT,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_event_assignments" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_event_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_invites" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT,
    "accessLevel" "GuestAccessLevel" NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "inviteToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "lastAccessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "guest_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_sessions" (
    "id" TEXT NOT NULL,
    "guestInviteId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "guest_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_uploads" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "storageProvider" "StorageProvider" NOT NULL DEFAULT 'LOCAL',
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "thumbnailPath" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "file_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "memberId" TEXT,
    "sessionId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "previousValue" JSONB,
    "newValue" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "result" "AuditResult" NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "family_members_email_key" ON "family_members"("email");

-- CreateIndex
CREATE INDEX "family_members_familyId_idx" ON "family_members"("familyId");

-- CreateIndex
CREATE INDEX "family_members_email_idx" ON "family_members"("email");

-- CreateIndex
CREATE UNIQUE INDEX "module_configurations_moduleId_key" ON "module_configurations"("moduleId");

-- CreateIndex
CREATE INDEX "module_configurations_familyId_moduleId_idx" ON "module_configurations"("familyId", "moduleId");

-- CreateIndex
CREATE INDEX "chore_definitions_familyId_isActive_idx" ON "chore_definitions"("familyId", "isActive");

-- CreateIndex
CREATE INDEX "chore_schedules_choreDefinitionId_isActive_idx" ON "chore_schedules"("choreDefinitionId", "isActive");

-- CreateIndex
CREATE INDEX "chore_assignments_choreScheduleId_memberId_idx" ON "chore_assignments"("choreScheduleId", "memberId");

-- CreateIndex
CREATE INDEX "chore_instances_choreScheduleId_dueDate_status_idx" ON "chore_instances"("choreScheduleId", "dueDate", "status");

-- CreateIndex
CREATE INDEX "chore_instances_assignedToId_dueDate_idx" ON "chore_instances"("assignedToId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "screen_time_settings_memberId_key" ON "screen_time_settings"("memberId");

-- CreateIndex
CREATE INDEX "screen_time_settings_memberId_idx" ON "screen_time_settings"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "screen_time_balances_memberId_key" ON "screen_time_balances"("memberId");

-- CreateIndex
CREATE INDEX "screen_time_balances_memberId_weekStartDate_idx" ON "screen_time_balances"("memberId", "weekStartDate");

-- CreateIndex
CREATE INDEX "screen_time_transactions_memberId_createdAt_idx" ON "screen_time_transactions"("memberId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "screen_time_grace_settings_memberId_key" ON "screen_time_grace_settings"("memberId");

-- CreateIndex
CREATE INDEX "screen_time_grace_settings_memberId_idx" ON "screen_time_grace_settings"("memberId");

-- CreateIndex
CREATE INDEX "grace_period_logs_memberId_requestedAt_idx" ON "grace_period_logs"("memberId", "requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "credit_balances_memberId_key" ON "credit_balances"("memberId");

-- CreateIndex
CREATE INDEX "credit_balances_memberId_idx" ON "credit_balances"("memberId");

-- CreateIndex
CREATE INDEX "credit_transactions_memberId_createdAt_idx" ON "credit_transactions"("memberId", "createdAt");

-- CreateIndex
CREATE INDEX "todo_items_familyId_status_dueDate_idx" ON "todo_items"("familyId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "todo_items_assignedToId_idx" ON "todo_items"("assignedToId");

-- CreateIndex
CREATE INDEX "shopping_lists_familyId_isActive_idx" ON "shopping_lists"("familyId", "isActive");

-- CreateIndex
CREATE INDEX "shopping_items_listId_status_idx" ON "shopping_items"("listId", "status");

-- CreateIndex
CREATE INDEX "calendar_events_familyId_startTime_endTime_idx" ON "calendar_events"("familyId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "calendar_event_assignments_memberId_idx" ON "calendar_event_assignments"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_event_assignments_eventId_memberId_key" ON "calendar_event_assignments"("eventId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "guest_invites_inviteCode_key" ON "guest_invites"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "guest_invites_inviteToken_key" ON "guest_invites"("inviteToken");

-- CreateIndex
CREATE INDEX "guest_invites_familyId_status_idx" ON "guest_invites"("familyId", "status");

-- CreateIndex
CREATE INDEX "guest_invites_inviteCode_idx" ON "guest_invites"("inviteCode");

-- CreateIndex
CREATE INDEX "guest_invites_inviteToken_idx" ON "guest_invites"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "guest_sessions_sessionToken_key" ON "guest_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "guest_sessions_guestInviteId_idx" ON "guest_sessions"("guestInviteId");

-- CreateIndex
CREATE INDEX "guest_sessions_sessionToken_idx" ON "guest_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "file_uploads_familyId_entityType_entityId_idx" ON "file_uploads"("familyId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_familyId_action_createdAt_idx" ON "audit_logs"("familyId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_memberId_createdAt_idx" ON "audit_logs"("memberId", "createdAt");

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_configurations" ADD CONSTRAINT "module_configurations_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chore_definitions" ADD CONSTRAINT "chore_definitions_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chore_schedules" ADD CONSTRAINT "chore_schedules_choreDefinitionId_fkey" FOREIGN KEY ("choreDefinitionId") REFERENCES "chore_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chore_assignments" ADD CONSTRAINT "chore_assignments_choreScheduleId_fkey" FOREIGN KEY ("choreScheduleId") REFERENCES "chore_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chore_assignments" ADD CONSTRAINT "chore_assignments_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chore_instances" ADD CONSTRAINT "chore_instances_choreScheduleId_fkey" FOREIGN KEY ("choreScheduleId") REFERENCES "chore_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chore_instances" ADD CONSTRAINT "chore_instances_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chore_instances" ADD CONSTRAINT "chore_instances_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chore_instances" ADD CONSTRAINT "chore_instances_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screen_time_settings" ADD CONSTRAINT "screen_time_settings_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screen_time_balances" ADD CONSTRAINT "screen_time_balances_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screen_time_transactions" ADD CONSTRAINT "screen_time_transactions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screen_time_transactions" ADD CONSTRAINT "screen_time_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screen_time_grace_settings" ADD CONSTRAINT "screen_time_grace_settings_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grace_period_logs" ADD CONSTRAINT "grace_period_logs_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grace_period_logs" ADD CONSTRAINT "grace_period_logs_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_balances" ADD CONSTRAINT "credit_balances_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_adjustedById_fkey" FOREIGN KEY ("adjustedById") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todo_items" ADD CONSTRAINT "todo_items_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todo_items" ADD CONSTRAINT "todo_items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todo_items" ADD CONSTRAINT "todo_items_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_listId_fkey" FOREIGN KEY ("listId") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_purchasedById_fkey" FOREIGN KEY ("purchasedById") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_assignments" ADD CONSTRAINT "calendar_event_assignments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_assignments" ADD CONSTRAINT "calendar_event_assignments_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_invites" ADD CONSTRAINT "guest_invites_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_invites" ADD CONSTRAINT "guest_invites_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_sessions" ADD CONSTRAINT "guest_sessions_guestInviteId_fkey" FOREIGN KEY ("guestInviteId") REFERENCES "guest_invites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
