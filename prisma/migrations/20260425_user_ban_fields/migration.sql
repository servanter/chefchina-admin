-- AlterTable: add ban-related fields to users
ALTER TABLE "users" ADD COLUMN "isBanned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "bannedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "bannedReason" TEXT;
