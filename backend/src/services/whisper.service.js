const OpenAI = require('openai');
const { toFile } = require('openai');
const logger = require('../utils/logger');

// Low-resource languages that may not have a reliable Whisper model
const LOW_RESOURCE_LANGUAGES = new Set([
  'tigrinya', 'oromo', 'somali', 'amharic', 'swahili',
  'hausa', 'yoruba', 'igbo', 'zulu', 'xhosa',
]);

let openaiClient;
const getClient = () => {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
};

// Bug 1 fix: proper ISO-639-1 codes instead of naive slice(0,2)
const LANGUAGE_ISO_MAP = {
  english:    'en',
  spanish:    'es',
  arabic:     'ar',
  hindi:      'hi',
  urdu:       'ur',
  french:     'fr',
  german:     'de',
  portuguese: 'pt',
  mandarin:   'zh',
  russian:    'ru',
  turkish:    'tr',
  indonesian: 'id',
};

/**
 * Compute a simple fluency score from a Whisper transcript.
 * Score is based on:
 *   - word count (proxy for duration and engagement)
 *   - absence of [inaudible] / [BLANK_AUDIO] markers
 *   - ratio of unique words (lexical diversity)
 */
const computeFluencyScore = (transcript, durationSeconds = 30) => {
  if (!transcript || transcript.trim().length === 0) return 0;

  const clean = transcript.replace(/\[.*?\]/g, '').trim();
  const isCJK = /[一-鿿]/.test(clean);
  const tokens = isCJK
    ? clean.replace(/\s+/g, '').split('')
    : clean.split(/\s+/).filter(Boolean);
  const unique = new Set(tokens.map((t) => t.toLowerCase()));

  // Score speaking PACE against the actual duration, not a fixed 90s window.
  // Natural pace ≈ 2 words/sec (≈4 chars/sec for CJK). Reaching ~70% of that
  // already earns full pace marks, so a normal reader is not penalised.
  const dur = Math.max(durationSeconds || 0, 5);
  const perSec = tokens.length / dur;
  const targetPerSec = isCJK ? 4 : 2;
  const paceScore = Math.min(perSec / (targetPerSec * 0.7), 1) * 60;

  // Lexical variety (a reading passage is naturally varied)
  const diversityScore = (unique.size / Math.max(tokens.length, 1)) * 30;

  // Small baseline so any clear, intelligible speech starts from a fair floor
  const baseline = tokens.length >= 8 ? 10 : 0;

  // Penalise inaudible markers
  const markerCount    = (transcript.match(/\[.*?\]/g) || []).length;
  const clarityPenalty = Math.min(markerCount * 5, 20);

  const raw = paceScore + diversityScore + baseline - clarityPenalty;
  return Math.min(Math.max(Math.round(raw), 0), 100);
};

/**
 * Transcribe audio using OpenAI Whisper.
 * Returns { transcript, fluencyScore, languageDetected, flaggedForHumanReview, raw }
 */
const transcribe = async (audioBuffer, mimeType, selectedLanguage) => {
  const client = getClient();

  const isLowResource = LOW_RESOURCE_LANGUAGES.has((selectedLanguage || '').toLowerCase());

  // For low-resource languages: check minimum audio length then flag
  if (isLowResource) {
    const estimatedSeconds = audioBuffer.length / (16000 * 2);
    if (estimatedSeconds < 30) {
      return {
        transcript: null,
        fluencyScore: null,
        languageDetected: selectedLanguage,
        flaggedForHumanReview: true,
        raw: { note: 'Low-resource language; audio too short for automated scoring' },
      };
    }
  }

  const ext = mimeType.includes('ogg') ? 'ogg'
    : mimeType.includes('wav')  ? 'wav'
    : mimeType.includes('mpeg') || mimeType.includes('mp3') ? 'mp3'
    : mimeType.includes('mp4') ? 'mp4'
    : 'webm';

  const file = await toFile(audioBuffer, `audio.${ext}`, { type: mimeType });

  const params = {
    model:            'whisper-1',
    file,
    response_format:  'verbose_json',
    temperature:      0,
  };

  // Only send a language hint when we have a KNOWN, valid ISO-639-1 code.
  // For unmapped languages (e.g. Marshallese) we must NOT send a made-up code
  // like "ma" — Whisper rejects it (400) and the whole request fails. Omitting
  // the hint lets Whisper auto-detect instead, so the transcription still runs.
  const whisperLang = selectedLanguage?.toLowerCase();
  const isoCode = whisperLang && whisperLang !== 'other' ? LANGUAGE_ISO_MAP[whisperLang] : undefined;
  if (isoCode) {
    params.language = isoCode;
  } else if (whisperLang && whisperLang !== 'other') {
    logger.warn('No ISO mapping for language; letting Whisper auto-detect', { language: whisperLang });
  }

  logger.info('Calling Whisper API', { language: params.language });
  let response = await client.audio.transcriptions.create(params);

  // Bug 2 fix: if Whisper returns only dots/whitespace, retry without the language
  // hint so it auto-detects instead of forcing a language it struggles with
  const isDotOnly = (text) => !text || /^[\s.……]+$/.test(text);
  let usedFallback = false;
  if (isDotOnly(response.text) && params.language) {
    logger.warn('Whisper returned empty/dot transcript, retrying without language hint', { language: params.language });
    const fallbackParams = { ...params };
    delete fallbackParams.language;
    response = await client.audio.transcriptions.create(fallbackParams);
    usedFallback = true;
  }

  // If transcript is still just dots after fallback, treat as unreadable
  const rawText = response.text || '';
  const transcript = isDotOnly(rawText) ? null : rawText;
  const fluencyScore = transcript ? computeFluencyScore(transcript, response.duration) : null;

  const flaggedForHumanReview =
    isLowResource ||
    usedFallback ||
    transcript === null ||
    fluencyScore === 0 ||
    (transcript?.toLowerCase().includes('[blank_audio]') ?? false) ||
    (response.segments || []).some((s) => s.no_speech_prob > 0.8);

  return {
    transcript,
    fluencyScore,
    languageDetected: response.language || selectedLanguage,
    flaggedForHumanReview,
    raw: {
      language: response.language,
      duration: response.duration,
      segments: response.segments?.length,
    },
  };
};

module.exports = { transcribe };
