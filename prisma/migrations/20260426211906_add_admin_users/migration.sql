-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'SUPER_ADMIN');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_username_key" ON "admin_users"("username");

-- Insert default admin user (password: 123456, hashed with bcrypt)
-- Password hash for "123456" using bcryptjs rounds=10
INSERT INTO "admin_users" ("id", "username", "passwordHash", "role", "createdAt", "updatedAt")
VALUES (
    'cuid_admin_001',
    'admin',
    '$2b$10$G/SSKatTuzLS724oQjU8fOD79lupKiGjG/r3NBTAwhZC3819vd9VG',
    'ADMIN',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
