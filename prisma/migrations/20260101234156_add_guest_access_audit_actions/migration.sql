-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'GUEST_INVITE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'GUEST_INVITE_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE 'GUEST_SESSION_STARTED';
ALTER TYPE "AuditAction" ADD VALUE 'GUEST_SESSION_ENDED';
ALTER TYPE "AuditAction" ADD VALUE 'GUEST_ACCESS_DENIED';
