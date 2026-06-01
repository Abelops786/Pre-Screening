-- CreateEnum
CREATE TYPE "Department" AS ENUM ('INTERPRETATION', 'SALES', 'CUSTOMER_SERVICE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'PENDING', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InterpretationClient" AS ENUM ('BIG_LANGUAGE', 'TRANSPERFECT', 'LANGO', 'BOOSTLINGO');

-- CreateEnum
CREATE TYPE "PositionType" AS ENUM ('US_BASED', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('DEDICATED_HOURLY', 'PER_MINUTE');

-- AlterEnum: add AUTO_DISQUALIFIED to CandidateStatus
ALTER TYPE "CandidateStatus" ADD VALUE IF NOT EXISTS 'AUTO_DISQUALIFIED';

-- CreateTable: jobs
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" "Department" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduled_publish_at" TIMESTAMP(3),
    "client" "InterpretationClient",
    "position_type" "PositionType",
    "role_type" "RoleType",
    "description" TEXT,
    "min_download_speed" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "min_upload_speed" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add new nullable columns to candidates
ALTER TABLE "candidates"
    ADD COLUMN IF NOT EXISTS "department" "Department",
    ADD COLUMN IF NOT EXISTS "job_id" TEXT,
    ADD COLUMN IF NOT EXISTS "vocaroo_url" TEXT,
    ADD COLUMN IF NOT EXISTS "questionnaire_answers" JSONB,
    ADD COLUMN IF NOT EXISTS "auto_disqualify_reason" TEXT;

-- Make existing required fields optional (nullable) to support new department flows
ALTER TABLE "candidates" ALTER COLUMN "years_experience" DROP NOT NULL;
ALTER TABLE "candidates" ALTER COLUMN "availability_shift" DROP NOT NULL;
ALTER TABLE "candidates" ALTER COLUMN "selected_language" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_job_id_fkey"
    FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
