-- Sprint 004: comment reply enhancements
ALTER TABLE "comments"
  ADD COLUMN IF NOT EXISTS "replyToUserId" TEXT;

CREATE INDEX IF NOT EXISTS "comments_parentId_idx" ON "comments"("parentId");
CREATE INDEX IF NOT EXISTS "comments_replyToUserId_idx" ON "comments"("replyToUserId");
