-- CreateEnum (如果不存在)
DO $$ BEGIN
  CREATE TYPE "UserGender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PRIVATE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gender" "UserGender";
