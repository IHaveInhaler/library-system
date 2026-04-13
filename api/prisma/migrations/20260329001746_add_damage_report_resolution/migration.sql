-- AlterTable
ALTER TABLE "DamageReport" ADD COLUMN "resolvedAt" DATETIME;
ALTER TABLE "DamageReport" ADD COLUMN "resolvedById" TEXT;
ALTER TABLE "DamageReport" ADD COLUMN "resolvedNote" TEXT;
