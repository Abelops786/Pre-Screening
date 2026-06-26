const { validationResult } = require('express-validator');
const prisma = require('../config/database');
const { success, error } = require('../utils/responseHelper');
const emailService = require('../services/email.service');
const vpnService = require('../services/vpnCheck.service');

// African countries — used by the Sales campaign location filter
const AFRICAN_COUNTRIES = [
  'algeria','angola','benin','botswana','burkina faso','burundi','cabo verde','cape verde',
  'cameroon','central african republic','chad','comoros','congo','dr congo','democratic republic of the congo',
  'djibouti','egypt','equatorial guinea','eritrea','eswatini','swaziland','ethiopia','gabon','gambia','ghana',
  'guinea','guinea-bissau','ivory coast','cote d\'ivoire','kenya','lesotho','liberia','libya','madagascar',
  'malawi','mali','mauritania','mauritius','morocco','mozambique','namibia','niger','nigeria','rwanda',
  'sao tome and principe','senegal','seychelles','sierra leone','somalia','south africa','south sudan','sudan',
  'tanzania','togo','tunisia','uganda','zambia','zimbabwe',
];

const isBlockedSalesLocation = (countryRaw) => {
  const country = (countryRaw || '').toLowerCase().trim();
  if (!country) return false;
  const blocked = ['jamaica', 'philippines', 'egypt'];
  if (blocked.some((c) => country.includes(c))) return true;
  return AFRICAN_COUNTRIES.some((c) => country === c || country.includes(c));
};

// ── Original flow submit (kept intact) ────────────────────────
const submit = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return error(res, 'Validation failed', 422, errors.array());

    const {
      fullName, email, phone, location,
      yearsExperience, availabilityShift, certifications,
      selectedLanguage,
    } = req.body;

    const candidate = await prisma.candidate.create({
      data: {
        fullName, email, phone, location,
        yearsExperience: parseInt(yearsExperience, 10),
        availabilityShift,
        certifications: certifications || [],
        selectedLanguage,
        status: 'PENDING',
      },
    });

    emailService.sendConfirmation(candidate).catch(() => {});
    return success(res, { candidateId: candidate.id }, 'Application submitted successfully', 201);
  } catch (err) {
    if (err.code === 'P2002') {
      const existing = await prisma.candidate.findFirst({
        where: { email: req.body.email },
        select: { id: true, status: true },
      });
      return res.status(409).json({ success: false, message: 'already_applied', data: existing });
    }
    next(err);
  }
};

// Recruiter assignment now happens on a round-robin basis at the moment a
// candidate PASSES Level 1 (see recruiterAssignment.service), not at apply
// time — so the rotation distributes evenly across candidates who actually
// reach the booking calendar.

// ── New department-based job application submit ────────────────
const submitJobApplication = async (req, res, next) => {
  try {
    const { jobId: jobParam } = req.params;
    const { fullName, email, phone, location, questionnaireAnswers, vocarooUrl } = req.body;

    if (!fullName?.trim()) return error(res, 'Full name is required', 422);
    if (!email?.trim())    return error(res, 'Email is required', 422);
    if (!phone?.trim())    return error(res, 'Phone is required', 422);
    if (!location?.trim()) return error(res, 'Location is required', 422);

    // Support slug OR cuid in the URL — always use job.id for the FK
    const job = await prisma.job.findFirst({ where: { OR: [{ id: jobParam }, { slug: jobParam }] } });
    if (!job || job.status !== 'PUBLISHED') return error(res, 'Job not found or not available', 404);

    const jobId = job.id; // Use the real DB id, never the slug

    // Try to extract language from questionnaire
    let extractedLanguage = null;
    if (questionnaireAnswers) {
      const keys = Object.keys(questionnaireAnswers);
      const langKey = keys.find(k => k.toLowerCase() === 'language' || k.toLowerCase() === 'targetlanguage' || k.toLowerCase() === 'languagepair');
      if (langKey) {
        const val = questionnaireAnswers[langKey];
        if (typeof val === 'string') extractedLanguage = val;
        else if (Array.isArray(val) && val.length > 0) extractedLanguage = val[0];
      }
    }

    const createCandidate = (extraData = {}) => prisma.candidate.create({
      data: {
        fullName, email, phone, location,
        department: job.department,
        jobId,
        vocarooUrl: vocarooUrl || null,
        questionnaireAnswers: questionnaireAnswers || {},
        certifications: [],
        selectedLanguage: extractedLanguage,
        status: 'PENDING',
        ...extraData,
      },
    });

    // ── Auto-disqualifiers ───────────────────────────────────
    // Questions the admin hid must not be used for eligibility/rejection.
    const qTemplate = await prisma.questionnaireTemplate.findUnique({ where: { department: job.department } });
    const hiddenKeys = new Set(
      (qTemplate?.schema?.sections || [])
        .flatMap((s) => s.fields || [])
        .filter((f) => f && f.hidden)
        .map((f) => f.key),
    );

    if (job.department === 'SALES') {
      const country = questionnaireAnswers?.country || location;
      if (isBlockedSalesLocation(country)) {
        const c = await createCandidate({ status: 'AUTO_DISQUALIFIED', autoDisqualifyReason: 'Location not eligible for this campaign' });
        return success(res, { candidateId: c.id, autoDisqualified: true, reason: 'Location not eligible for this campaign' }, 'Application received', 201);
      }
    }

    if (job.department === 'INTERPRETATION') {
      const isASL = (questionnaireAnswers?.languagePair || '').toLowerCase().includes('asl');
      if (isASL && !hiddenKeys.has('ridCertified') && questionnaireAnswers?.ridCertified !== 'Yes') {
        const c = await createCandidate({ status: 'AUTO_DISQUALIFIED', autoDisqualifyReason: 'ASL role requires a valid RID certification' });
        return success(res, { candidateId: c.id, autoDisqualified: true, reason: 'ASL role requires a valid RID certification' }, 'Application received', 201);
      }

      if (job.positionType === 'US_BASED' && !hiddenKeys.has('residesInUS') && questionnaireAnswers?.residesInUS === 'No') {
        const c = await createCandidate({ status: 'AUTO_DISQUALIFIED', autoDisqualifyReason: 'U.S.-based position requires U.S. residency' });
        return success(res, { candidateId: c.id, autoDisqualified: true, reason: 'U.S.-based position requires U.S. residency' }, 'Application received', 201);
      }
    }

    // ── Create candidate ──
    // Candidates can apply freely — a previous, completed, or deleted application
    // never blocks a new one. If they have an in-progress application for THIS
    // job (e.g. they refreshed), we resume it instead of creating a duplicate.
    const IN_PROGRESS = ['PENDING', 'SYSTEM_CHECK_FAILED', 'AUDIO_PENDING', 'PROCESSING'];
    const resumable = await prisma.candidate.findFirst({
      where: { email, jobId, deletedAt: null, status: { in: IN_PROGRESS } },
      orderBy: { createdAt: 'desc' },
    });
    if (resumable) {
      const updated = await prisma.candidate.update({
        where: { id: resumable.id },
        data: { fullName, phone, location, vocarooUrl: vocarooUrl || null, questionnaireAnswers: questionnaireAnswers || {}, selectedLanguage: extractedLanguage },
      });
      return res.status(409).json({ success: false, message: 'already_applied', data: { id: updated.id, status: updated.status, jobId: updated.jobId } });
    }

    const candidate = await createCandidate();

    emailService.sendConfirmation(candidate).catch(() => {});
    return success(res, { candidateId: candidate.id, autoDisqualified: false }, 'Application submitted successfully', 201);
  } catch (err) {
    next(err);
  }
};

// Real client IP behind Railway's proxy (trust proxy is set in app.js)
const getClientIp = (req) => {
  const xff = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xff || req.ip || req.socket?.remoteAddress || '';
};

// ── VPN / proxy pre-check (public, called before Level 1 starts) ──
const vpnCheck = async (req, res, next) => {
  try {
    const ip = getClientIp(req);
    const tz = req.query.tz ? String(req.query.tz) : undefined;
    const result = await vpnService.checkVpn(ip, tz);
    return success(res, { ...result, ip }, 'VPN check complete');
  } catch (err) {
    // Never block the candidate on an internal error
    return success(res, { vpn: false, reason: null, country: null }, 'VPN check skipped');
  }
};

// ── System check ───────────────────────────────────────────────
const saveSystemCheck = async (req, res, next) => {
  try {
    const { id: candidateId } = req.params;
    const {
      downloadSpeed, uploadSpeed, deviceType, os, browser, micPermitted, speakerPermitted,
      // extended diagnostics (admin/recruiter-only)
      screenResolution, cpuCores, deviceMemory, connectionType,
      networkLatency, networkJitter, micInputLevel, backgroundNoise,
      browserVersion, timezone, cpuArchitecture, gpuRenderer,
    } = req.body;

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { jobId: true },
    });

    let minDownload = parseFloat(process.env.MIN_DOWNLOAD_SPEED_MBPS || '5');
    let minUpload   = parseFloat(process.env.MIN_UPLOAD_SPEED_MBPS   || '2');

    if (candidate?.jobId) {
      const job = await prisma.job.findUnique({
        where: { id: candidate.jobId },
        select: { minDownloadSpeed: true, minUploadSpeed: true },
      });
      if (job) { minDownload = job.minDownloadSpeed; minUpload = job.minUploadSpeed; }
    }

    const passed =
      parseFloat(downloadSpeed) >= minDownload &&
      parseFloat(uploadSpeed)   >= minUpload   &&
      micPermitted === true;

    // Server-side VPN/proxy check so the result is always recorded for admins,
    // even if the candidate bypassed the front-end popup. Fails open.
    const ip = getClientIp(req);
    const vpn = await vpnService.checkVpn(ip, timezone);

    const num = (v) => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

    const diagnostics = {
      screenResolution: screenResolution ?? null,
      cpuCores:        num(cpuCores) != null ? Math.round(num(cpuCores)) : null,
      deviceMemory:    num(deviceMemory),
      connectionType:  connectionType ?? null,
      networkLatency:  num(networkLatency) != null ? Math.round(num(networkLatency)) : null,
      networkJitter:   num(networkJitter) != null ? Math.round(num(networkJitter)) : null,
      micInputLevel:   num(micInputLevel) != null ? Math.round(num(micInputLevel)) : null,
      backgroundNoise: num(backgroundNoise) != null ? Math.round(num(backgroundNoise)) : null,
      browserVersion:  browserVersion ?? null,
      timezone:        timezone ?? null,
      cpuArchitecture: cpuArchitecture ?? null,
      gpuRenderer:     gpuRenderer ?? null,
      ipAddress:       ip || null,
      ipCountry:       vpn.country ?? null,
      vpnDetected:     vpn.vpn,
      vpnReason:       vpn.reason ?? null,
    };

    const check = await prisma.systemCheck.upsert({
      where:  { candidateId },
      create: { candidateId, downloadSpeed, uploadSpeed, deviceType, os, browser, micPermitted, speakerPermitted, passed, ...diagnostics },
      update: { downloadSpeed, uploadSpeed, deviceType, os, browser, micPermitted, speakerPermitted, passed, ...diagnostics },
    });

    const nextStatus = passed ? 'AUDIO_PENDING' : 'SYSTEM_CHECK_FAILED';

    await prisma.candidate.update({ where: { id: candidateId }, data: { status: nextStatus } });

    return success(res, { passed, check }, passed ? 'System check passed' : 'System check failed');
  } catch (err) {
    next(err);
  }
};

const getCandidateLanguage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      select: { selectedLanguage: true, questionnaireAnswers: true }
    });
    
    if (!candidate) return error(res, 'Candidate not found', 404);

    let language = candidate.selectedLanguage;
    if (!language && candidate.questionnaireAnswers) {
      const keys = Object.keys(candidate.questionnaireAnswers);
      const langKey = keys.find(k => k.toLowerCase() === 'language' || k.toLowerCase() === 'targetlanguage' || k.toLowerCase() === 'languagepair');
      if (langKey) {
        const val = candidate.questionnaireAnswers[langKey];
        if (typeof val === 'string') language = val;
        else if (Array.isArray(val) && val.length > 0) language = val[0];
      }
    }

    return success(res, { language }, 'Candidate language retrieved');
  } catch (err) {
    next(err);
  }
};

module.exports = { submit, submitJobApplication, saveSystemCheck, getCandidateLanguage, vpnCheck };
