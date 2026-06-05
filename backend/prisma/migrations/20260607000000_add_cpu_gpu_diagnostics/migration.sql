-- SystemCheck: CPU architecture + GPU renderer (closest hardware signals a browser exposes)
ALTER TABLE "system_checks" ADD COLUMN IF NOT EXISTS "cpu_architecture" TEXT;
ALTER TABLE "system_checks" ADD COLUMN IF NOT EXISTS "gpu_renderer" TEXT;
