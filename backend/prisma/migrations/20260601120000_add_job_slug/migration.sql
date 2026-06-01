-- AlterTable: add slug to jobs
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- CreateIndex: unique slug
CREATE UNIQUE INDEX IF NOT EXISTS "jobs_slug_key" ON "jobs"("slug");
