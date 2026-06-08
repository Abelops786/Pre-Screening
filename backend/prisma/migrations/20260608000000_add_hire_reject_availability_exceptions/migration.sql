-- CandidateStatus: add HIRED
ALTER TYPE "CandidateStatus" ADD VALUE IF NOT EXISTS 'HIRED';

-- Candidate: rejection reason + detail
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "rejection_detail" TEXT;

-- Recruiter one-off blocks: full day off/leave, or a time range on a date
CREATE TABLE IF NOT EXISTS "availability_exceptions" (
    "id" TEXT NOT NULL,
    "recruiter_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "all_day" BOOLEAN NOT NULL DEFAULT true,
    "start_time" TEXT,
    "end_time" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_exceptions_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "availability_exceptions"
    ADD CONSTRAINT "availability_exceptions_recruiter_id_fkey"
    FOREIGN KEY ("recruiter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "availability_exceptions_recruiter_id_date_idx"
  ON "availability_exceptions" ("recruiter_id", "date");
