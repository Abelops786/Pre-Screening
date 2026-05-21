const prisma = require('../config/database');
const storageService = require('../services/storage.service');
const whisperService = require('../services/whisper.service');
const filterService  = require('../services/filter.service');
const emailService   = require('../services/email.service');
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

    // Persist audio recording
    await prisma.audioRecording.upsert({
      where:  { candidateId },
      create: {
        candidateId,
        audioUrl,
        durationSeconds,
        transcript:            whisperResult.transcript,
        fluencyScore:          whisperResult.fluencyScore,
        languageDetected:      whisperResult.languageDetected,
        whisperRawResponse:    whisperResult.raw,
        flaggedForHumanReview: whisperResult.flaggedForHumanReview,
        processedAt:           new Date(),
      },
      update: {
        audioUrl,
        durationSeconds,
        transcript:            whisperResult.transcript,
        fluencyScore:          whisperResult.fluencyScore,
        languageDetected:      whisperResult.languageDetected,
        whisperRawResponse:    whisperResult.raw,
        flaggedForHumanReview: whisperResult.flaggedForHumanReview,
        processedAt:           new Date(),
      },
    });

    // Run filter engine
    const fullCandidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { systemCheck: true, audioRecording: true },
    });

    const filterResult = filterService.evaluate(fullCandidate);

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
      emailService.sendLevel1Pass(updatedCandidate).catch(() => {});
    } else {
      emailService.sendRejection(updatedCandidate, filterResult.rejectionReasons).catch(() => {});
    }

    return success(res, {
      status: finalStatus,
      qualified: filterResult.qualified,
      fluencyScore: whisperResult.fluencyScore,
      transcript: whisperResult.transcript,
      flaggedForHumanReview: whisperResult.flaggedForHumanReview,
    }, filterResult.qualified ? 'Congratulations! You passed Level 1.' : 'Application processed.');
  } catch (err) {
    next(err);
  }
};

module.exports = { processAudio };
