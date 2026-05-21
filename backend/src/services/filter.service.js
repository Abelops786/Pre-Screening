/**
 * Filter Engine – evaluates a candidate against hard and AI-based rules.
 *
 * Hard filters (auto-reject on first failure):
 *   1. Minimum download speed
 *   2. Minimum upload speed
 *   3. Microphone permission granted
 *   4. Required certifications present (if configured)
 *   5. Availability shift match (if configured)
 *
 * AI filter:
 *   6. Fluency score >= MIN_FLUENCY_SCORE (default 60)
 *
 * Returns { filtersApplied, rejectionReasons, qualified }
 */

const MIN_DOWNLOAD = parseFloat(process.env.MIN_DOWNLOAD_SPEED_MBPS || '5');
const MIN_UPLOAD   = parseFloat(process.env.MIN_UPLOAD_SPEED_MBPS   || '2');
const MIN_FLUENCY  = parseFloat(process.env.MIN_FLUENCY_SCORE        || '60');

// Optional: comma-separated list of required certifications (e.g. "CompTIA A+,CCNA")
const REQUIRED_CERTS = (process.env.REQUIRED_CERTIFICATIONS || '')
  .split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);

// Optional: comma-separated list of accepted availability shifts
const REQUIRED_SHIFTS = (process.env.REQUIRED_AVAILABILITY_SHIFTS || '')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

const evaluate = (candidate) => {
  const rejectionReasons = [];
  const filtersApplied   = [];

  const check = candidate.systemCheck;
  const audio = candidate.audioRecording;

  // ── Hard filter 1: Download speed ─────────────────────────
  filtersApplied.push({ rule: 'min_download_speed', threshold: MIN_DOWNLOAD, value: check?.downloadSpeed });
  if (!check || check.downloadSpeed < MIN_DOWNLOAD) {
    rejectionReasons.push(`Download speed too low (${check?.downloadSpeed ?? 'N/A'} Mbps, minimum ${MIN_DOWNLOAD} Mbps)`);
  }

  // ── Hard filter 2: Upload speed ────────────────────────────
  filtersApplied.push({ rule: 'min_upload_speed', threshold: MIN_UPLOAD, value: check?.uploadSpeed });
  if (!check || check.uploadSpeed < MIN_UPLOAD) {
    rejectionReasons.push(`Upload speed too low (${check?.uploadSpeed ?? 'N/A'} Mbps, minimum ${MIN_UPLOAD} Mbps)`);
  }

  // ── Hard filter 3: Microphone permission ───────────────────
  filtersApplied.push({ rule: 'mic_permission', value: check?.micPermitted });
  if (!check?.micPermitted) {
    rejectionReasons.push('Microphone access was not granted');
  }

  // ── Hard filter 4: Required certifications ─────────────────
  if (REQUIRED_CERTS.length > 0) {
    const candidateCerts = (candidate.certifications || []).map((c) => c.toLowerCase());
    const missing = REQUIRED_CERTS.filter((r) => !candidateCerts.includes(r));
    filtersApplied.push({ rule: 'required_certifications', required: REQUIRED_CERTS, present: candidateCerts });
    if (missing.length > 0) {
      rejectionReasons.push(`Missing required certifications: ${missing.join(', ')}`);
    }
  }

  // ── Hard filter 5: Availability shift ─────────────────────
  if (REQUIRED_SHIFTS.length > 0) {
    filtersApplied.push({ rule: 'availability_shift', accepted: REQUIRED_SHIFTS, value: candidate.availabilityShift });
    if (!REQUIRED_SHIFTS.includes(candidate.availabilityShift?.toLowerCase())) {
      rejectionReasons.push(`Availability shift "${candidate.availabilityShift}" does not match required shifts: ${REQUIRED_SHIFTS.join(', ')}`);
    }
  }

  // ── AI filter 6: Fluency score ─────────────────────────────
  filtersApplied.push({ rule: 'min_fluency_score', threshold: MIN_FLUENCY, value: audio?.fluencyScore });
  if (audio?.flaggedForHumanReview) {
    // Flagged recordings are not auto-rejected — put them in qualified for human review
    filtersApplied.push({ rule: 'human_review_flag', value: true });
  } else if (!audio || audio.fluencyScore === null || audio.fluencyScore < MIN_FLUENCY) {
    rejectionReasons.push(`Fluency score too low (${audio?.fluencyScore ?? 'N/A'}%, minimum ${MIN_FLUENCY}%)`);
  }

  const qualified = rejectionReasons.length === 0;

  return { filtersApplied, rejectionReasons, qualified };
};

module.exports = { evaluate };
