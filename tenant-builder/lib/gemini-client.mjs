/**
 * Gemini SDK client for vision + video analysis.
 * Uses @google/generative-ai (already in ConversionOS package.json).
 *
 * Primary use: Design Director — analyses screenshots + scroll recordings
 * to produce a Design Language Document capturing the site's visual DNA.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'node:fs';

let _client = null;

function getClient() {
  if (!_client) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY or GOOGLE_AI_API_KEY not set');
    _client = new GoogleGenerativeAI(apiKey);
  }
  return _client;
}

/**
 * Send a prompt to Gemini with optional image/video inputs.
 *
 * @param {string} prompt - Text prompt
 * @param {object} [options]
 * @param {string} [options.model='gemini-3.1-pro-preview'] - Model to use
 * @param {Array<{path: string, mimeType?: string}>} [options.media] - Image/video file paths
 * @param {number} [options.maxOutputTokens=4096] - Max output tokens
 * @returns {Promise<string>} - Response text
 */
export async function callGemini(prompt, {
  model = 'gemini-3.1-pro-preview',
  media = [],
  maxOutputTokens = 4096,
} = {}) {
  const client = getClient();
  const genModel = client.getGenerativeModel({ model });

  const parts = [];

  // Add media files (images + video)
  for (const item of media) {
    const data = readFileSync(item.path);
    const base64 = data.toString('base64');
    const mimeType = item.mimeType || guessMimeType(item.path);
    parts.push({ inlineData: { data: base64, mimeType } });
  }

  // Add text prompt
  parts.push({ text: prompt });

  const result = await genModel.generateContent({
    contents: [{ role: 'user', parts }],
    generationConfig: { maxOutputTokens },
  });

  return result.response.text();
}

/**
 * Guess MIME type from file extension.
 */
function guessMimeType(path) {
  const ext = path.split('.').pop()?.toLowerCase();
  const map = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    webm: 'video/webm',
    mp4: 'video/mp4',
  };
  return map[ext] || 'application/octet-stream';
}
