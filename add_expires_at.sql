-- Add expiresAt column to ai_generated_recipes table
ALTER TABLE "ai_generated_recipes" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

-- Set expiresAt for existing records (7 days from creation)
UPDATE "ai_generated_recipes" SET "expiresAt" = "createdAt" + INTERVAL '7 days' WHERE "expiresAt" IS NULL;

-- Make the column required
ALTER TABLE "ai_generated_recipes" ALTER COLUMN "expiresAt" SET NOT NULL;

-- Add index for cleanup queries
CREATE INDEX IF NOT EXISTS "ai_generated_recipes_expiresAt_idx" ON "ai_generated_recipes"("expiresAt");
