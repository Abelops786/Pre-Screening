-- SystemCheck: extended diagnostics + VPN/proxy detection (admin/recruiter-only)
ALTER TABLE "system_checks" ADD COLUMN IF NOT EXISTS "screen_resolution" TEXT;
ALTER TABLE "system_checks" ADD COLUMN IF NOT EXISTS "cpu_cores" INTEGER;
ALTER TABLE "system_checks" ADD COLUMN IF NOT EXISTS "device_memory" DOUBLE PRECISION;
ALTER TABLE "system_checks" ADD COLUMN IF NOT EXISTS "connection_type" TEXT;
ALTER TABLE "system_checks" ADD COLUMN IF NOT EXISTS "network_latency" INTEGER;
ALTER TABLE "system_checks" ADD COLUMN IF NOT EXISTS "network_jitter" INTEGER;
ALTER TABLE "system_checks" ADD COLUMN IF NOT EXISTS "mic_input_level" INTEGER;
ALTER TABLE "system_checks" ADD COLUMN IF NOT EXISTS "background_noise" INTEGER;
ALTER TABLE "system_checks" ADD COLUMN IF NOT EXISTS "browser_version" TEXT;
ALTER TABLE "system_checks" ADD COLUMN IF NOT EXISTS "timezone" TEXT;
ALTER TABLE "system_checks" ADD COLUMN IF NOT EXISTS "ip_address" TEXT;
ALTER TABLE "system_checks" ADD COLUMN IF NOT EXISTS "ip_country" TEXT;
ALTER TABLE "system_checks" ADD COLUMN IF NOT EXISTS "vpn_detected" BOOLEAN;
ALTER TABLE "system_checks" ADD COLUMN IF NOT EXISTS "vpn_reason" TEXT;
