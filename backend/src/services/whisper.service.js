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
const computeFluencyScore = (transcript, durationHint = 90) => {
  if (!transcript || transcript.trim().length === 0) return 0;

  const clean = transcript.replace(/\[.*?\]/g, '').trim();

  // Bug 3 fix: Mandarin uses characters not spaces — count characters instead of words
  const isCJK = /[一-鿿]/.test(clean);
  const tokens = isCJK
    ? clean.replace(/\s+/g, '').split('')
    : clean.split(/\s+/).filter(Boolean);
  const unique = new Set(tokens.map((t) => t.toLowerCase()));

  // CJK speakers produce ~300 chars/min vs ~120 words/min for others
  const expectedCount  = isCJK ? durationHint * (300 / 60) : durationHint * (120 / 60);
  const countScore     = Math.min(tokens.length / expectedCount, 1) * 50;
  const diversityScore = (unique.size / Math.max(tokens.length, 1)) * 30;

  // Penalise for inaudible markers
  const markerCount    = (transcript.match(/\[.*?\]/g) || []).length;
  const clarityPenalty = Math.min(markerCount * 5, 20);

  const raw = countScore + diversityScore - clarityPenalty;
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
    : 'webm';

  const file = await toFile(audioBuffer, `audio.${ext}`, { type: mimeType });

  const params = {
    model:            'whisper-1',
    file,
    response_format:  'verbose_json',
    temperature:      0,
  };

  // Bug 1 fix: use proper ISO-639-1 map instead of naive slice(0,2)
  const whisperLang = selectedLanguage?.toLowerCase();
  if (whisperLang && whisperLang !== 'other') {
    params.language = LANGUAGE_ISO_MAP[whisperLang] ?? whisperLang.slice(0, 2);
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

  const transcript = response.text || '';
  const fluencyScore = computeFluencyScore(transcript);

  const flaggedForHumanReview =
    isLowResource ||
    usedFallback ||
    fluencyScore === 0 ||
    transcript.toLowerCase().includes('[blank_audio]') ||
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
