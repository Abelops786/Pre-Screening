const { validationResult } = require('express-validator');
const prisma = require('../config/database');
const { success, error } = require('../utils/responseHelper');
const emailService = require('../services/email.service');

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
        fullName,
        email,
        phone,
        location,
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

// ── New department-based job application submit ────────────────
const submitJobApplication = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { fullName, email, phone, location, questionnaireAnswers, vocarooUrl } = req.body;

    if (!fullName?.trim()) return error(res, 'Full name is required', 422);
    if (!email?.trim())    return error(res, 'Email is required', 422);
    if (!phone?.trim())    return error(res, 'Phone is required', 422);
    if (!location?.trim()) return error(res, 'Location is required', 422);

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.status !== 'PUBLISHED') return error(res, 'Job not found or not available', 404);

    // Sales: country auto-disqualifier
    if (job.department === 'SALES') {
      const blockedCountries = ['jamaica', 'philippines', 'egypt'];
      const country = (questionnaireAnswers?.country || '').toLowerCase();
      const isAfrica = (questionnaireAnswers?.isAfrica === true);
      if (blockedCountries.some((c) => country.includes(c)) || isAfrica) {
        const candidate = await prisma.candidate.create({
          data: {
            fullName, email, phone, location,
            department: job.department,
            jobId,
            questionnaireAnswers: questionnaireAnswers || {},
            status: 'AUTO_DISQUALIFIED',
            autoDisqualifyReason: 'Location not eligible for this campaign',
            certifications: [],
          },
        });
        return success(res, { candidateId: candidate.id, autoDisqualified: true, reason: candidate.autoDisqualifyReason }, 'Application received', 201);
      }
    }

    // Interpretation: ASL without RID cert auto-disqualifier
    if (job.department === 'INTERPRETATION') {
      const isASL = (questionnaireAnswers?.languagePair || '').toLowerCase().includes('asl');
      const hasRID = questionnaireAnswers?.ridCertified === true;
      if (isASL && !hasRID) {
        const candidate = await prisma.candidate.create({
          data: {
            fullName, email, phone, location,
            department: job.department,
            jobId,
            questionnaireAnswers: questionnaireAnswers || {},
            status: 'AUTO_DISQUALIFIED',
            autoDisqualifyReason: 'ASL role requires a valid RID certification',
            certifications: [],
          },
        });
        return success(res, { candidateId: candidate.id, autoDisqualified: true, reason: candidate.autoDisqualifyReason }, 'Application received', 201);
      }

      // U.S.-based position: must be in the U.S.
      if (job.positionType === 'US_BASED' && questionnaireAnswers?.residesInUS === false) {
        const candidate = await prisma.candidate.create({
          data: {
            fullName, email, phone, location,
            department: job.department,
            jobId,
            questionnaireAnswers: questionnaireAnswers || {},
            status: 'AUTO_DISQUALIFIED',
            autoDisqualifyReason: 'U.S.-based position requires U.S. residency',
            certifications: [],
          },
        });
        return success(res, { candidateId: candidate.id, autoDisqualified: true, reason: candidate.autoDisqualifyReason }, 'Application received', 201);
      }
    }

    const candidate = await prisma.candidate.create({
      data: {
        fullName,
        email,
        phone,
        location,
        department: job.department,
        jobId,
        vocarooUrl: vocarooUrl || null,
        questionnaireAnswers: questionnaireAnswers || {},
        status: 'PENDING',
        certifications: [],
      },
    });

    // Auto-assign to recruiter whose department matches
    try {
      const deptLabel = job.department === 'CUSTOMER_SERVICE' ? 'Customer Service'
        : job.department === 'SALES' ? 'Sales'
        : 'Interpretation';
      const recruiter = await prisma.user.findFirst({
        where: {
          role: { in: ['RECRUITER', 'ADMIN'] },
          department: { contains: deptLabel, mode: 'insensitive' },
          isActive: true,
        },
      });
      if (recruiter) {
        await prisma.recruiterCandidateAssignment.create({
          data: { recruiterId: recruiter.id, candidateId: candidate.id },
        });
      }
    } catch (_) { /* non-blocking */ }

    emailService.sendConfirmation(candidate).catch(() => {});
    return success(res, { candidateId: candidate.id, autoDisqualified: false }, 'Application submitted successfully', 201);
  } catch (err) {
    if (err.code === 'P2002') {
      const existing = await prisma.candidate.findUnique({
        where: { email: req.body.email },
        select: { id: true, status: true, jobId: true },
      });
      return res.status(409).json({ success: false, message: 'already_applied', data: existing });
    }
    next(err);
  }
};

// ── Original system check (kept intact) ───────────────────────
const saveSystemCheck = async (req, res, next) => {
  try {
    const { id: candidateId } = req.params;
    const {
      downloadSpeed, uploadSpeed,
      deviceType, os, browser,
      micPermitted, speakerPermitted,
    } = req.body;

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { jobId: true },
    });

    // Use job-specific thresholds if available, else fall back to env vars
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

    await prisma.candidate.update({
      where: { id: candidateId },
      data:  { status: passed ? 'AUDIO_PENDING' : 'SYSTEM_CHECK_FAILED' },
    });

    return success(res, { passed, check }, passed ? 'System check passed' : 'System check failed');
  } catch (err) {
    next(err);
  }
};

module.exports = { submit, submitJobApplication, saveSystemCheck };
