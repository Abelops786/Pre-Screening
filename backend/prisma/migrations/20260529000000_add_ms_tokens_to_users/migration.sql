-- AlterTable: add Microsoft OAuth token columns to users (Stage 2 pre-built fields)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ms_access_token" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ms_refresh_token" TEXT;
