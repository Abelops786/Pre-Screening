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

/**
 * Compute a simple fluency score from a Whisper transcript.
 * Score is based on:
 *   - word count (proxy for duration and engagement)
 *   - absence of [inaudible] / [BLANK_AUDIO] markers
 *   - ratio of unique words (lexical diversity)
 */
const computeFluencyScore = (transcript, durationHint = 90) => {
  if (!transcript || transcript.trim().length === 0) return 0;

  const clean  = transcript.replace(/\[.*?\]/g, '').trim();
  const words  = clean.split(/\s+/).filter(Boolean);
  const unique = new Set(words.map((w) => w.toLowerCase()));

  // Expect ~100-150 wpm for a natural speaker over the allotted time
  const expectedWords    = durationHint * (120 / 60);
  const wordCountScore   = Math.min(words.length / expectedWords, 1) * 50;
  const diversityScore   = (unique.size / Math.max(words.length, 1)) * 30;

  // Penalise for inaudible markers
  const markerCount    = (transcript.match(/\[.*?\]/g) || []).length;
  const clarityPenalty = Math.min(markerCount * 5, 20);

  const raw = wordCountScore + diversityScore - clarityPenalty;
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

  // Hint Whisper with the candidate's chosen language when known
  const whisperLang = selectedLanguage?.toLowerCase();
  if (whisperLang && whisperLang !== 'other') {
    params.language = whisperLang.slice(0, 2); // ISO-639-1 code
  }

  logger.info('Calling Whisper API', { language: params.language });
  const response = await client.audio.transcriptions.create(params);

  const transcript = response.text || '';
  const fluencyScore = computeFluencyScore(transcript);

  const flaggedForHumanReview =
    isLowResource ||
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
