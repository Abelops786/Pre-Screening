-- Candidate soft delete: kept for 15 days, then permanently purged.
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "candidates_deleted_at_idx" ON "candidates" ("deleted_at");
