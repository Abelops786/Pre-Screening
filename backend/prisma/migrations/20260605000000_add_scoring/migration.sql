-- AudioRecording: GPT AI assessment fields
ALTER TABLE "audio_recordings" ADD COLUMN IF NOT EXISTS "ai_score" DOUBLE PRECISION;
ALTER TABLE "audio_recordings" ADD COLUMN IF NOT EXISTS "ai_feedback" TEXT;

-- FilterResult: weighted composite score + breakdown
ALTER TABLE "filter_results" ADD COLUMN IF NOT EXISTS "total_score" DOUBLE PRECISION;
ALTER TABLE "filter_results" ADD COLUMN IF NOT EXISTS "score_breakdown" JSONB;

-- ScoringConfig singleton
CREATE TABLE IF NOT EXISTS "scoring_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "weight_questionnaire" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
    "weight_audio" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
    "weight_speed" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "weight_headphone" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "pass_threshold" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scoring_config_pkey" PRIMARY KEY ("id")
);

INSERT INTO "scoring_config" ("id", "updated_at") VALUES ('default', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
