const OpenAI = require('openai');
const logger = require('../utils/logger');

let client;
const getClient = () => {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
};

/**
 * Assess spoken fluency from a Whisper transcript using GPT.
 * Returns { score: 0–10, feedback: string }.
 * Falls back to null on any error so the caller can use the heuristic score.
 */
const assessFluency = async (transcript, language = 'English') => {
  const text = (transcript || '').trim();
  if (!text || /^[\s.…]+$/.test(text)) {
    return { score: 0, feedback: 'No intelligible speech was detected in the recording.' };
  }

  const prompt = `You are a professional language assessor evaluating a job candidate's spoken ${language}.
Below is a transcript of the candidate reading/speaking aloud. Rate their fluency on a scale of 0 to 10, considering:
- grammar and sentence structure
- vocabulary range and accuracy
- coherence and natural flow
- overall communicative effectiveness

Transcript:
"""${text.slice(0, 4000)}"""

Respond ONLY with strict JSON in this exact shape:
{"score": <number 0-10, one decimal allowed>, "feedback": "<one concise sentence justifying the score>"}`;

  try {
    const response = await getClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      response_format: { type: 'json_object' },
      max_tokens: 200,
    });

    const raw = response.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);
    let score = Number(parsed.score);
    if (!Number.isFinite(score)) score = 0;
    score = Math.min(Math.max(score, 0), 10);
    return { score: Math.round(score * 10) / 10, feedback: String(parsed.feedback || '').slice(0, 500) };
  } catch (err) {
    logger.warn('AI fluency assessment failed, falling back to heuristic', { error: err.message });
    return null;
  }
};

module.exports = { assessFluency };
