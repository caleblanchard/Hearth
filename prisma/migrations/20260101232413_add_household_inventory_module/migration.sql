-- CreateEnum
CREATE TYPE "InventoryCategory" AS ENUM ('FOOD_PANTRY', 'FOOD_FRIDGE', 'FOOD_FREEZER', 'CLEANING', 'TOILETRIES', 'PAPER_GOODS', 'MEDICINE', 'PET_SUPPLIES', 'OTHER');

-- CreateEnum
CREATE TYPE "InventoryLocation" AS ENUM ('PANTRY', 'FRIDGE', 'FREEZER', 'BATHROOM', 'GARAGE', 'LAUNDRY_ROOM', 'KITCHEN_CABINET', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'INVENTORY_ITEM_ADDED';
ALTER TYPE "AuditAction" ADD VALUE 'INVENTORY_ITEM_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'INVENTORY_ITEM_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'INVENTORY_QUANTITY_ADJUSTED';
ALTER TYPE "AuditAction" ADD VALUE 'INVENTORY_ITEM_RESTOCKED';

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "InventoryCategory" NOT NULL,
    "location" "InventoryLocation" NOT NULL,
    "currentQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "lowStockThreshold" DOUBLE PRECISION,
    "expiresAt" TIMESTAMP(3),
    "barcode" TEXT,
    "notes" TEXT,
    "lastRestockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_items_familyId_idx" ON "inventory_items"("familyId");

-- CreateIndex
CREATE INDEX "inventory_items_category_idx" ON "inventory_items"("category");

-- CreateIndex
CREATE INDEX "inventory_items_expiresAt_idx" ON "inventory_items"("expiresAt");

-- CreateIndex
CREATE INDEX "inventory_items_currentQuantity_idx" ON "inventory_items"("currentQuantity");

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
