const prisma = require('../config/database');
const storageService = require('../services/storage.service');
const whisperService = require('../services/whisper.service');
const filterService  = require('../services/filter.service');
const scoringService = require('../services/scoring.service');
const aiService      = require('../services/aiAssessment.service');
const emailService   = require('../services/email.service');
const msService      = require('../services/microsoft.service');
const { success, error } = require('../utils/responseHelper');
const logger = require('../utils/logger');

const processAudio = async (req, res, next) => {
  try {
    if (!req.file) return error(res, 'Audio file is required', 400);

    const { candidateId } = req.params;
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { systemCheck: true },
    });
    if (!candidate) return error(res, 'Candidate not found', 404);
    if (candidate.status !== 'AUDIO_PENDING') {
      return error(res, 'Candidate is not in audio pending state', 409);
    }

    await prisma.candidate.update({ where: { id: candidateId }, data: { status: 'PROCESSING' } });

    // Upload audio to storage
    let audioUrl;
    try {
      audioUrl = await storageService.upload(
        req.file.buffer,
        `audio_${candidateId}.webm`,
        req.file.mimetype,
        `audio/${candidateId}`,
      );
    } catch (storageErr) {
      logger.error('Audio storage upload failed', { candidateId, error: storageErr.message });
      await prisma.candidate.update({ where: { id: candidateId }, data: { status: 'AUDIO_PENDING' } });
      return error(res, 'Audio upload failed. Please try again.', 503);
    }

    // Whisper transcription
    let whisperResult;
    try {
      whisperResult = await whisperService.transcribe(req.file.buffer, req.file.mimetype, candidate.selectedLanguage);
    } catch (whisperErr) {
      logger.error('Whisper API call failed', { candidateId, error: whisperErr.message });
      // Save recording without score; flag for human review
      await prisma.audioRecording.upsert({
        where:  { candidateId },
        create: { candidateId, audioUrl, durationSeconds: 0, flaggedForHumanReview: true, processedAt: new Date() },
        update: { audioUrl, flaggedForHumanReview: true, processedAt: new Date() },
      });
      await prisma.candidate.update({ where: { id: candidateId }, data: { status: 'AUDIO_PENDING' } });
      return error(res, 'Audio analysis service is temporarily unavailable. Your recording was saved.', 503);
    }

    const durationSeconds = req.file.size / (16000 * 2); // rough estimate for webm

    // GPT-based fluency assessment (actual AI assessment of the transcript)
    let aiScore = null;
    let aiFeedback = null;
    try {
      const ai = await aiService.assessFluency(whisperResult.transcript, candidate.selectedLanguage || 'English');
      if (ai) { aiScore = ai.score; aiFeedback = ai.feedback; }
    } catch (aiErr) {
      logger.warn('AI assessment errored', { candidateId, error: aiErr.message });
    }

    const audioData = {
      audioUrl,
      durationSeconds,
      transcript:            whisperResult.transcript,
      fluencyScore:          whisperResult.fluencyScore,
      aiScore,
      aiFeedback,
      languageDetected:      whisperResult.languageDetected,
      whisperRawResponse:    whisperResult.raw,
      flaggedForHumanReview: whisperResult.flaggedForHumanReview,
      processedAt:           new Date(),
    };

    // Persist audio recording
    await prisma.audioRecording.upsert({
      where:  { candidateId },
      create: { candidateId, ...audioData },
      update: audioData,
    });

    // Evaluate: weighted composite scoring for job-based candidates,
    // legacy filter engine for the original flow.
    const fullCandidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { systemCheck: true, audioRecording: true, job: true },
    });

    let filterResult;
    if (fullCandidate.jobId) {
      const r = await scoringService.evaluate(fullCandidate);
      filterResult = {
        filtersApplied:   r.breakdown,
        rejectionReasons: r.rejectionReasons,
        qualified:        r.qualified,
        totalScore:       r.totalScore,
        scoreBreakdown:   r.breakdown,
      };
    } else {
      filterResult = filterService.evaluate(fullCandidate);
    }

    await prisma.filterResult.upsert({
      where:  { candidateId },
      create: { candidateId, ...filterResult },
      update: filterResult,
    });

    const finalStatus = filterResult.qualified ? 'LEVEL1_PASSED' : 'REJECTED';
    await prisma.candidate.update({ where: { id: candidateId }, data: { status: finalStatus } });

    // Send notification email (non-blocking)
    const updatedCandidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (filterResult.qualified) {
      // Try to auto-create a Teams meeting using the admin's stored refresh token
      // (refresh tokens don't expire like access tokens, so this keeps working)
      let teamsLink = null;
      try {
        const admin = await prisma.user.findFirst({
          where: { role: 'SUPER_ADMIN', msRefreshToken: { not: null } },
        });
        if (admin?.msRefreshToken) {
          const meeting = await msService.createOnlineMeetingWithRefresh(
            admin.msRefreshToken,
            `TalentScreen Interview – ${updatedCandidate.fullName}`,
          );
          teamsLink = meeting.joinWebUrl || meeting.joinUrl || null;
          // Persist the interview record with Teams link
          await prisma.interview.create({
            data: {
              candidateId,
              recruiterId: admin.id,
              scheduledTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // placeholder: 1 week from now
              msTeamsLink: teamsLink,
            },
          });
          logger.info('Teams meeting created for Level 1 pass', { candidateId, teamsLink });
        }
      } catch (msErr) {
        logger.warn('Could not create Teams meeting, sending email without link', { error: msErr.message });
      }
      emailService.sendLevel1Pass(updatedCandidate, teamsLink).catch(() => {});
    } else {
      // Neutral "under review" email — never tell the candidate they failed.
      // The recruiter still sees the real REJECTED status in the dashboard.
      emailService.sendUnderReview(updatedCandidate).catch(() => {});
    }

    return success(res, {
      status: finalStatus,
      qualified: filterResult.qualified,
      // For job candidates, surface the weighted total; otherwise the fluency score
      fluencyScore: filterResult.totalScore ?? whisperResult.fluencyScore,
      transcript: whisperResult.transcript,
      flaggedForHumanReview: whisperResult.flaggedForHumanReview,
    }, filterResult.qualified ? 'Congratulations! You passed Level 1.' : 'Application processed.');
  } catch (err) {
    next(err);
  }
};

module.exports = { processAudio };
