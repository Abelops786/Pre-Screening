const { validationResult } = require('express-validator');
const prisma = require('../config/database');
const { success, error } = require('../utils/responseHelper');
const emailService = require('../services/email.service');

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
      const existing = await prisma.candidate.findUnique({
        where: { email: req.body.email },
        select: { id: true, status: true },
      });
      return res.status(409).json({ success: false, message: 'already_applied', data: existing });
    }
    next(err);
  }
};

// ── Shared auto-assign helper ──────────────────────────────────
const autoAssignRecruiter = async (jobDepartment, candidateId) => {
  try {
    const deptLabel = jobDepartment === 'CUSTOMER_SERVICE' ? 'Customer Service'
      : jobDepartment === 'SALES' ? 'Sales'
      : 'Interpretation';
    const recruiter = await prisma.user.findFirst({
      where: {
        role: { in: ['RECRUITER', 'ADMIN'] },
        department: { contains: deptLabel, mode: 'insensitive' },
        isActive: true,
      },
    });
    if (recruiter) {
      await prisma.recruiterCandidateAssignment.upsert({
        where: { recruiterId_candidateId: { recruiterId: recruiter.id, candidateId } },
        create: { recruiterId: recruiter.id, candidateId },
        update: {},
      });
    }
  } catch (_) { /* non-blocking */ }
};

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

    const createCandidate = (extraData = {}) => prisma.candidate.create({
      data: {
        fullName, email, phone, location,
        department: job.department,
        jobId,
        vocarooUrl: vocarooUrl || null,
        questionnaireAnswers: questionnaireAnswers || {},
        certifications: [],
        status: 'PENDING',
        ...extraData,
      },
    });

    const updateCandidateForNewJob = (existingId) => prisma.candidate.update({
      where: { id: existingId },
      data: {
        fullName, phone, location,
        department: job.department,
        jobId,
        vocarooUrl: vocarooUrl || null,
        questionnaireAnswers: questionnaireAnswers || {},
        status: 'PENDING',
        autoDisqualifyReason: null,
      },
    });

    // ── Auto-disqualifiers ───────────────────────────────────
    if (job.department === 'SALES') {
      const country = questionnaireAnswers?.country || location;
      if (isBlockedSalesLocation(country)) {
        const c = await createCandidate({ status: 'AUTO_DISQUALIFIED', autoDisqualifyReason: 'Location not eligible for this campaign' }).catch(async (e) => {
          if (e.code === 'P2002') {
            const ex = await prisma.candidate.findUnique({ where: { email } });
            return updateCandidateForNewJob(ex.id).then((u) => ({ ...u, autoDisqualifyReason: 'Location not eligible for this campaign' }));
          }
          throw e;
        });
        return success(res, { candidateId: c.id, autoDisqualified: true, reason: 'Location not eligible for this campaign' }, 'Application received', 201);
      }
    }

    if (job.department === 'INTERPRETATION') {
      const isASL = (questionnaireAnswers?.languagePair || '').toLowerCase().includes('asl');
      if (isASL && questionnaireAnswers?.ridCertified !== 'Yes') {
        const c = await createCandidate({ status: 'AUTO_DISQUALIFIED', autoDisqualifyReason: 'ASL role requires a valid RID certification' }).catch(async (e) => {
          if (e.code === 'P2002') {
            const ex = await prisma.candidate.findUnique({ where: { email } });
            return updateCandidateForNewJob(ex.id).then((u) => ({ ...u, autoDisqualifyReason: 'ASL role requires a valid RID certification' }));
          }
          throw e;
        });
        return success(res, { candidateId: c.id, autoDisqualified: true, reason: 'ASL role requires a valid RID certification' }, 'Application received', 201);
      }

      if (job.positionType === 'US_BASED' && questionnaireAnswers?.residesInUS === 'No') {
        const c = await createCandidate({ status: 'AUTO_DISQUALIFIED', autoDisqualifyReason: 'U.S.-based position requires U.S. residency' }).catch(async (e) => {
          if (e.code === 'P2002') {
            const ex = await prisma.candidate.findUnique({ where: { email } });
            return updateCandidateForNewJob(ex.id).then((u) => ({ ...u, autoDisqualifyReason: 'U.S.-based position requires U.S. residency' }));
          }
          throw e;
        });
        return success(res, { candidateId: c.id, autoDisqualified: true, reason: 'U.S.-based position requires U.S. residency' }, 'Application received', 201);
      }
    }

    // ── Create candidate (or update existing if same email) ──
    let candidate;
    try {
      candidate = await createCandidate();
    } catch (e) {
      if (e.code === 'P2002') {
        // Same email already in DB — update their record for this new job application
        const existing = await prisma.candidate.findUnique({ where: { email } });
        if (!existing) throw e;

        // If same job, resume instead of overwriting
        if (existing.jobId === jobId) {
          return res.status(409).json({ success: false, message: 'already_applied', data: { id: existing.id, status: existing.status, jobId: existing.jobId } });
        }

        // Different job (or original flow with no jobId) — overwrite with new application
        candidate = await updateCandidateForNewJob(existing.id);
      } else {
        throw e;
      }
    }

    await autoAssignRecruiter(job.department, candidate.id);
    emailService.sendConfirmation(candidate).catch(() => {});
    return success(res, { candidateId: candidate.id, autoDisqualified: false }, 'Application submitted successfully', 201);
  } catch (err) {
    next(err);
  }
};

// ── System check ───────────────────────────────────────────────
const saveSystemCheck = async (req, res, next) => {
  try {
    const { id: candidateId } = req.params;
    const { downloadSpeed, uploadSpeed, deviceType, os, browser, micPermitted, speakerPermitted } = req.body;

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

    const check = await prisma.systemCheck.upsert({
      where:  { candidateId },
      create: { candidateId, downloadSpeed, uploadSpeed, deviceType, os, browser, micPermitted, speakerPermitted, passed },
      update: { downloadSpeed, uploadSpeed, deviceType, os, browser, micPermitted, speakerPermitted, passed },
    });

    const nextStatus = passed ? 'AUDIO_PENDING' : 'SYSTEM_CHECK_FAILED';

    await prisma.candidate.update({ where: { id: candidateId }, data: { status: nextStatus } });

    return success(res, { passed, check }, passed ? 'System check passed' : 'System check failed');
  } catch (err) {
    next(err);
  }
};

module.exports = { submit, submitJobApplication, saveSystemCheck };
