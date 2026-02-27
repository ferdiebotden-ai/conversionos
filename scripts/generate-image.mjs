#!/usr/bin/env node

/**
 * Reusable Gemini Image Generator
 * Generates photorealistic images using gemini-3.1-flash-image-preview (Nano Banana 2)
 *
 * Usage:
 *   node scripts/generate-image.mjs --prompt "A stunning kitchen..." --output public/images/demo/hero.png
 *   node scripts/generate-image.mjs  # runs default craftsmanship-detail generation
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { writeFileSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// Load .env.local
function loadEnv() {
  try {
    const envPath = resolve(projectRoot, '.env.local');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx);
      const value = trimmed.slice(eqIdx + 1);
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local not found, rely on existing env vars
  }
}

loadEnv();

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  console.error('Error: GOOGLE_GENERATIVE_AI_API_KEY not set');
  process.exit(1);
}

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

const DEFAULT_PROMPT =
  'A stunning, photorealistic wide-angle photograph of a beautifully renovated open-concept kitchen and living room. Bright natural light streaming through large windows, white shaker cabinets, quartz waterfall island, warm hardwood floors, brushed gold pendant lights, clean modern lines. Professional architectural photography, warm and inviting. 4:3 aspect ratio.';

const prompt = getArg('prompt') || DEFAULT_PROMPT;
const outputPath = getArg('output') || resolve(projectRoot, 'public/images/demo/craftsmanship-detail.png');

async function generateImage() {
  console.log('Generating image with Gemini...');
  console.log(`Prompt: ${prompt.slice(0, 80)}...`);
  console.log(`Output: ${outputPath}`);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-image-preview',
    generationConfig: {
      responseModalities: ['image', 'text'],
    },
  });

  const result = await model.generateContent(prompt);
  const response = result.response;

  // Extract image from response parts
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const imageData = Buffer.from(part.inlineData.data, 'base64');
      writeFileSync(outputPath, imageData);
      console.log(`Image saved to ${outputPath} (${(imageData.length / 1024).toFixed(0)} KB)`);
      return;
    }
  }

  console.error('No image data in response. Text response:');
  for (const part of response.candidates[0].content.parts) {
    if (part.text) console.log(part.text);
  }
  process.exit(1);
}

generateImage().catch((err) => {
  console.error('Generation failed:', err.message);
  process.exit(1);
});
