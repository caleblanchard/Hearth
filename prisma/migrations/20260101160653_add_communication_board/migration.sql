-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('ANNOUNCEMENT', 'KUDOS', 'NOTE', 'PHOTO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'POST_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'POST_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'POST_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'POST_PINNED';
ALTER TYPE "AuditAction" ADD VALUE 'POST_UNPINNED';

-- CreateTable
CREATE TABLE "communication_posts" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "type" "PostType" NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_reactions" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "communication_posts_familyId_createdAt_idx" ON "communication_posts"("familyId", "createdAt");

-- CreateIndex
CREATE INDEX "communication_posts_familyId_isPinned_idx" ON "communication_posts"("familyId", "isPinned");

-- CreateIndex
CREATE INDEX "post_reactions_postId_idx" ON "post_reactions"("postId");

-- CreateIndex
CREATE INDEX "post_reactions_memberId_idx" ON "post_reactions"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "post_reactions_postId_memberId_emoji_key" ON "post_reactions"("postId", "memberId", "emoji");

-- AddForeignKey
ALTER TABLE "communication_posts" ADD CONSTRAINT "communication_posts_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_posts" ADD CONSTRAINT "communication_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "communication_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
