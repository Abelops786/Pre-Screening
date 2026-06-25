const prisma = require('../config/database');

// Effective position/role: pre-set on the job, else from the candidate's answer.
const effPos = (job, a) => job?.positionType || (a.positionType === 'us_based' ? 'US_BASED' : a.positionType === 'international' ? 'INTERNATIONAL' : null);
const effRole = (job, a) => job?.roleType || (a.roleType === 'dedicated_hourly' ? 'DEDICATED_HOURLY' : a.roleType === 'per_minute' ? 'PER_MINUTE' : null);

// Did the candidate actually SEE this section? (mirrors the apply form)
const sectionShown = (sec, a, job) => {
  if (sec.showIf?.jobPositionType && effPos(job, a) !== sec.showIf.jobPositionType) return false;
  if (sec.showIf?.jobRoleType && effRole(job, a) !== sec.showIf.jobRoleType) return false;
  return true;
};

// Did the candidate actually SEE this question? (hidden / conditional / job-gated)
const fieldShown = (f, a, job) => {
  if (f.hidden) return false;
  if (f.hideIfJobHas === 'positionType' && job?.positionType) return false;
  if (f.hideIfJobHas === 'roleType' && job?.roleType) return false;
  const s = f.showIf;
  if (!s) return true;
  if (s.jobPositionType) return effPos(job, a) === s.jobPositionType;
  if (s.jobRoleType) return effRole(job, a) === s.jobRoleType;
  if (s.key && s.equals !== undefined) return a[s.key] === s.equals;
  if (s.key && s.includes !== undefined) return String(a[s.key] || '').toLowerCase().includes(s.includes);
  return true;
};

// ── Questionnaire score from per-option scores defined in the template ──
// Only counts questions the candidate actually saw, so the % reflects the
// answers they could give (not conditional/hidden questions they never saw).
// Returns { earned, max, percent } across all scored, visible questions.
const scoreQuestionnaire = (answers, schema, job) => {
  let earned = 0;
  let max = 0;
  const a = answers || {};
  const fields = (schema?.sections || [])
    .filter((s) => sectionShown(s, a, job))
    .flatMap((s) => (s.fields || []).filter((f) => fieldShown(f, a, job)));

  for (const f of fields) {
    const ans = answers?.[f.key];
    const opt = f.optionScores || null;

    // Important questions (admin-flagged): full weight only if the answer matches
    // the correct answer. Takes precedence over per-option scores for this field.
    if (f.important && Number(f.importantWeight) > 0 && f.correctAnswer !== undefined && f.correctAnswer !== '') {
      const w = Number(f.importantWeight);
      max += w;
      const correct = f.type === 'checkbox'
        ? Array.isArray(ans) && ans.includes(f.correctAnswer)
        : String(ans ?? '') === String(f.correctAnswer);
      if (correct) earned += w;
      continue;
    }

    if ((f.type === 'radio' || f.type === 'select') && opt) {
      const values = Object.values(opt).map(Number).filter(Number.isFinite);
      const qMax = values.length ? Math.max(...values, 0) : 0;
      max += qMax;
      if (typeof ans === 'string' && Number.isFinite(Number(opt[ans]))) earned += Number(opt[ans]);
    } else if (f.type === 'checkbox' && opt) {
      const positive = Object.values(opt).map(Number).filter((n) => Number.isFinite(n) && n > 0);
      const qMax = positive.reduce((a, b) => a + b, 0);
      max += qMax;
      if (Array.isArray(ans)) {
        for (const sel of ans) if (Number.isFinite(Number(opt[sel]))) earned += Number(opt[sel]);
      }
    } else if (f.type === 'confirm' && Number(f.score) > 0) {
      max += Number(f.score);
      if (ans === 'Yes') earned += Number(f.score);
    }
  }

  earned = Math.max(0, Math.min(earned, max));
  const percent = max > 0 ? (earned / max) * 100 : null; // null = no scored questions
  return { earned, max, percent };
};

// ── Speed score (graded against the job's minimums) ──
const scoreSpeed = (check, minDown, minUp) => {
  if (!check) return 0;
  const d = Math.min(check.downloadSpeed / (minDown || 1), 1);
  const u = Math.min(check.uploadSpeed / (minUp || 1), 1);
  return Math.round(((d + u) / 2) * 100);
};

// ── Headphone score (from the questionnaire answer) ──
const scoreHeadphone = (answers, check) => {
  if (answers?.hasHeadset === 'Yes') return 100;
  if (answers?.hasHeadset === 'No') return 0;
  // fall back to system check speaker/mic if questionnaire didn't ask
  return check?.speakerPermitted ? 100 : 0;
};

// ── Audio score (GPT 0–10 → 0–100, else heuristic fluency) ──
const scoreAudio = (audio) => {
  if (!audio) return 0;
  if (Number.isFinite(audio.aiScore)) return Math.round(audio.aiScore * 10);
  if (Number.isFinite(audio.fluencyScore)) return Math.round(audio.fluencyScore);
  return 0;
};

const getConfig = async () => {
  let cfg = await prisma.scoringConfig.findUnique({ where: { id: 'default' } });
  if (!cfg) cfg = await prisma.scoringConfig.create({ data: { id: 'default' } });
  return cfg;
};

/**
 * Weighted composite evaluation for a job-based candidate.
 * Returns { qualified, totalScore, breakdown, rejectionReasons }.
 */
const evaluate = async (candidate) => {
  const cfg = await getConfig();
  const answers = candidate.questionnaireAnswers || {};
  const check   = candidate.systemCheck;
  const audio   = candidate.audioRecording;

  const minDown = candidate.job?.minDownloadSpeed ?? 20;
  const minUp   = candidate.job?.minUploadSpeed ?? 10;

  // Questionnaire template for this department
  const template = candidate.department
    ? await prisma.questionnaireTemplate.findUnique({ where: { department: candidate.department } })
    : null;

  const q = scoreQuestionnaire(answers, template?.schema, candidate.job);
  const questionnaireScore = q.percent;            // may be null if nothing scored
  const audioScore         = scoreAudio(audio);
  const speedScore         = scoreSpeed(check, minDown, minUp);
  const headphoneScore     = scoreHeadphone(answers, check);

  // Normalise weights — if questionnaire has no scored questions, drop its weight
  let { weightQuestionnaire: wq, weightAudio: wa, weightSpeed: ws, weightHeadphone: wh } = cfg;
  if (questionnaireScore === null) wq = 0;
  const totalWeight = wq + wa + ws + wh || 1;

  const totalScore = Math.round(
    ((questionnaireScore ?? 0) * wq + audioScore * wa + speedScore * ws + headphoneScore * wh) / totalWeight,
  );

  const qualified = totalScore >= cfg.passThreshold;

  const breakdown = {
    questionnaire: { score: questionnaireScore, earned: q.earned, max: q.max, weight: wq },
    audio:         { score: audioScore, aiScore: audio?.aiScore ?? null, weight: wa },
    speed:         { score: speedScore, download: check?.downloadSpeed ?? null, upload: check?.uploadSpeed ?? null, weight: ws },
    headphone:     { score: headphoneScore, weight: wh },
    passThreshold: cfg.passThreshold,
  };

  const rejectionReasons = qualified ? [] : [`Overall score ${totalScore}% is below the passing mark of ${cfg.passThreshold}%`];

  return { qualified, totalScore, breakdown, rejectionReasons };
};

module.exports = { evaluate, getConfig };
