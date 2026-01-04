-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CHORE_COMPLETED', 'CHORE_APPROVED', 'CHORE_REJECTED', 'CHORE_ASSIGNED', 'REWARD_REQUESTED', 'REWARD_APPROVED', 'REWARD_REJECTED', 'CREDITS_EARNED', 'CREDITS_SPENT', 'SCREENTIME_ADJUSTED', 'SCREENTIME_LOW', 'TODO_ASSIGNED', 'SHOPPING_REQUEST', 'GENERAL');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
