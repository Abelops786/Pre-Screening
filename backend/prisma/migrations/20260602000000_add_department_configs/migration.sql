-- CreateTable: department_configs (admin-managed department names)
CREATE TABLE "department_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "questionnaire_type" "Department" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "department_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "department_configs_name_key" ON "department_configs"("name");

-- AlterTable: add custom display label to jobs
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "department_label" TEXT;

-- Seed the three built-in departments
INSERT INTO "department_configs" ("id", "name", "questionnaire_type", "is_active", "created_at", "updated_at")
VALUES
  ('dept_interpretation_default', 'Interpretation',   'INTERPRETATION',   true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dept_sales_default',          'Sales',            'SALES',            true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('dept_cs_default',             'Customer Service', 'CUSTOMER_SERVICE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
