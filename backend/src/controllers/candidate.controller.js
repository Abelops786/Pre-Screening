const { validationResult } = require('express-validator');
const prisma = require('../config/database');
const { success, error } = require('../utils/responseHelper');
const emailService = require('../services/email.service');

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

    // Send confirmation email (non-blocking)
    emailService.sendConfirmation(candidate).catch(() => {});

    return success(res, { candidateId: candidate.id }, 'Application submitted successfully', 201);
  } catch (err) {
    if (err.code === 'P2002') {
      const existing = await prisma.candidate.findUnique({
        where: { email: req.body.email },
        select: { id: true, status: true },
      });
      return res.status(409).json({
        success: false,
        message: 'already_applied',
        data: existing,
      });
    }
    next(err);
  }
};

const saveSystemCheck = async (req, res, next) => {
  try {
    const { id: candidateId } = req.params;
    const {
      downloadSpeed, uploadSpeed,
      deviceType, os, browser,
      micPermitted, speakerPermitted,
    } = req.body;

    const minDownload = parseFloat(process.env.MIN_DOWNLOAD_SPEED_MBPS || '5');
    const minUpload   = parseFloat(process.env.MIN_UPLOAD_SPEED_MBPS   || '2');

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

module.exports = { submit, saveSystemCheck };
