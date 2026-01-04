-- CreateTable
CREATE TABLE IF NOT EXISTS "system_config" (
    "id" TEXT NOT NULL DEFAULT 'system',
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "setupCompletedAt" TIMESTAMP(3),
    "setupCompletedBy" TEXT,
    "version" TEXT NOT NULL DEFAULT '0.1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);
