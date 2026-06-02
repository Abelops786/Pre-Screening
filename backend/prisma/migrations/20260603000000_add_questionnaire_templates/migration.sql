-- CreateTable: questionnaire_templates (editable question definitions per department engine)
CREATE TABLE "questionnaire_templates" (
    "id" TEXT NOT NULL,
    "department" "Department" NOT NULL,
    "schema" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questionnaire_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "questionnaire_templates_department_key" ON "questionnaire_templates"("department");
