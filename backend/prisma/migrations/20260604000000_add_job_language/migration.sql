-- AlterTable: add language to jobs (e.g. the specific language a job is for)
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "language" TEXT;
