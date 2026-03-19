#!/usr/bin/env node

/**
 * generate-hero-frames.mjs
 *
 * Generates renovation transformation videos using Veo 3.1 (start → end frame
 * interpolation) and extracts JPEG frame sequences for the hero scrubber.
 *
 * Usage:
 *   node scripts/generate-hero-frames.mjs --style transitional
 *   node scripts/generate-hero-frames.mjs --all
 *   node scripts/generate-hero-frames.mjs --style modern --force
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

dotenv.config({ path: resolve(ROOT, '.env.local') });

const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!API_KEY) {
  console.error('Missing GOOGLE_GENERATIVE_AI_API_KEY in .env.local');
  process.exit(1);
}

// ── Config ────────────────────────────────────────────────────────

const STYLES = [
  { label: 'Modern', slug: 'modern' },
  { label: 'Transitional', slug: 'transitional' },
  { label: 'Farmhouse', slug: 'farmhouse' },
  { label: 'Industrial', slug: 'industrial' },
  { label: 'Scandinavian', slug: 'scandinavian' },
];

const VEO_MODEL = 'veo-3.1-generate-preview';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_ATTEMPTS = 36;
const FPS = 10;
const FRAME_WIDTH = 800;

// ── Parse args ────────────────────────────────────────────────────

const args = process.argv.slice(2);
const styleArg = args.includes('--style') ? args[args.indexOf('--style') + 1] : null;
const allFlag = args.includes('--all');
const forceFlag = args.includes('--force');
const dryRun = args.includes('--dry-run');

if (!styleArg && !allFlag) {
  console.log('Usage: node scripts/generate-hero-frames.mjs --style <slug> | --all');
  console.log('Styles:', STYLES.map(s => s.slug).join(', '));
  process.exit(0);
}

const stylesToProcess = allFlag ? STYLES : STYLES.filter(s => s.slug === styleArg);
if (stylesToProcess.length === 0) {
  console.error(`Unknown style: ${styleArg}`);
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function imageToBase64(filePath) {
  const absPath = resolve(ROOT, filePath);
  if (!existsSync(absPath)) throw new Error(`Image not found: ${absPath}`);
  return readFileSync(absPath).toString('base64');
}

async function generateVideo(beforePath, afterPath, styleLabel) {
  console.log(`\n🎬 Generating ${styleLabel} renovation video via Veo 3.1...`);

  const beforeBase64 = imageToBase64(beforePath);
  const afterBase64 = imageToBase64(afterPath);

  const prompt = [
    `Smooth cinematic renovation transformation of a kitchen.`,
    `The old kitchen is carefully demolished — cabinets pulled off walls, countertops removed, old backsplash tiles stripped away, debris cleared.`,
    `Then the new ${styleLabel} design is installed piece by piece — new cabinetry, countertops, backsplash, lighting.`,
    `Professional architectural photography, completely steady camera with zero movement, warm natural lighting.`,
    `The camera never moves — only the kitchen transforms. Construction documentary feel.`,
  ].join(' ');

  if (dryRun) {
    console.log(`   [DRY RUN] Prompt: "${prompt.slice(0, 150)}..."`);
    return null;
  }

  // Veo 3.1 request with bytesBase64Encoded format (Vertex AI style via Gemini API)
  const body = {
    instances: [{
      prompt,
      image: {
        bytesBase64Encoded: beforeBase64,
        mimeType: 'image/png',
      },
      lastFrame: {
        bytesBase64Encoded: afterBase64,
        mimeType: 'image/png',
      },
    }],
    parameters: {
      aspectRatio: '16:9',
      resolution: '720p',
      durationSeconds: 8,
    },
  };

  console.log(`   📤 Submitting to ${VEO_MODEL}... (images: ${(beforeBase64.length / 1024 / 1024).toFixed(1)}MB + ${(afterBase64.length / 1024 / 1024).toFixed(1)}MB)`);

  const submitRes = await fetch(`${BASE_URL}/models/${VEO_MODEL}:predictLongRunning`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`Veo API error (${submitRes.status}): ${errText}`);
  }

  const submitData = await submitRes.json();
  const operationName = submitData.name;
  if (!operationName) throw new Error(`No operation name: ${JSON.stringify(submitData)}`);

  console.log(`   ⏳ Operation: ${operationName}`);
  console.log(`   Polling every ${POLL_INTERVAL_MS / 1000}s (max ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 60000} min)...`);

  // Poll for completion
  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS);

    const pollRes = await fetch(`${BASE_URL}/${operationName}`, {
      headers: { 'x-goog-api-key': API_KEY },
    });

    if (!pollRes.ok) {
      console.log(`   ⚠️  Poll ${attempt} failed (${pollRes.status}), retrying...`);
      continue;
    }

    const pollData = await pollRes.json();

    if (pollData.done) {
      const elapsed = attempt * POLL_INTERVAL_MS / 1000;
      console.log(`   ✅ Complete (${elapsed}s)`);

      // Extract video — check multiple response formats
      const response = pollData.response || pollData;
      const samples = response?.generateVideoResponse?.generatedSamples
        || response?.generatedVideos
        || response?.predictions;

      if (!samples || samples.length === 0) {
        console.log('   Response:', JSON.stringify(pollData, null, 2).slice(0, 500));
        throw new Error('No video samples in response');
      }

      const sample = samples[0];
      const videoData = sample.video || sample;

      // Handle different response formats
      if (videoData?.bytesBase64Encoded) {
        return Buffer.from(videoData.bytesBase64Encoded, 'base64');
      }
      if (videoData?.inlineData?.data) {
        return Buffer.from(videoData.inlineData.data, 'base64');
      }
      if (videoData?.uri || videoData?.gcsUri) {
        const uri = videoData.uri || videoData.gcsUri;
        console.log(`   📥 Downloading from ${uri}...`);
        const dlRes = await fetch(uri, { headers: { 'x-goog-api-key': API_KEY } });
        if (!dlRes.ok) throw new Error(`Download failed: ${dlRes.status}`);
        return Buffer.from(await dlRes.arrayBuffer());
      }

      // If it's a file reference, try to download via the Files API
      if (videoData?.name) {
        const fileUri = `${BASE_URL}/${videoData.name}`;
        console.log(`   📥 Downloading file ${videoData.name}...`);
        const dlRes = await fetch(fileUri, { headers: { 'x-goog-api-key': API_KEY } });
        if (!dlRes.ok) {
          // Try alt download endpoint
          const altUri = `${BASE_URL}/${videoData.name}:download?alt=media`;
          const altRes = await fetch(altUri, { headers: { 'x-goog-api-key': API_KEY } });
          if (!altRes.ok) throw new Error(`Download failed from ${altUri}: ${altRes.status}`);
          return Buffer.from(await altRes.arrayBuffer());
        }
        return Buffer.from(await dlRes.arrayBuffer());
      }

      console.log('   Full response:', JSON.stringify(sample, null, 2).slice(0, 1000));
      throw new Error('Unknown video format in response');
    }

    process.stdout.write(`   ⏳ ${attempt}/${MAX_POLL_ATTEMPTS} (${attempt * 10}s)...          \r`);
  }

  throw new Error('Timed out waiting for video generation');
}

function extractFrames(videoBuffer, outputDir, styleSlug) {
  console.log(`\n🎞️  Extracting frames for ${styleSlug}...`);
  mkdirSync(outputDir, { recursive: true });

  const tmpVideo = `/tmp/hero-renovation-${styleSlug}.mp4`;
  writeFileSync(tmpVideo, videoBuffer);

  const cmd = `ffmpeg -y -i ${tmpVideo} -vf "scale=${FRAME_WIDTH}:-1,fps=${FPS}" -q:v 3 -start_number 0 "${outputDir}/frame_%03d.jpg"`;
  console.log(`   ${cmd}`);
  execSync(cmd, { stdio: 'pipe' });

  const frames = readdirSync(outputDir).filter(f => f.endsWith('.jpg'));
  console.log(`   ✅ ${frames.length} frames → ${outputDir}`);

  try { unlinkSync(tmpVideo); } catch {}
  return frames.length;
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log('🏗️  Hero Renovation Frame Generator');
  console.log(`   Model: ${VEO_MODEL} | FPS: ${FPS} | Width: ${FRAME_WIDTH}px`);

  const beforePath = 'public/images/hero/before-kitchen.png';

  for (const style of stylesToProcess) {
    const afterPath = `public/images/hero/after-${style.slug}.png`;
    const outputDir = resolve(ROOT, `public/images/hero/frames/${style.slug}`);

    if (existsSync(outputDir) && !forceFlag) {
      const existing = readdirSync(outputDir).filter(f => f.endsWith('.jpg'));
      if (existing.length > 20) {
        console.log(`\n⏭️  Skipping ${style.label} — ${existing.length} frames exist. Use --force.`);
        continue;
      }
    }

    try {
      const videoBuffer = await generateVideo(beforePath, afterPath, style.label);
      if (videoBuffer) {
        const count = extractFrames(videoBuffer, outputDir, style.slug);
        console.log(`\n✅ ${style.label}: ${count} frames ready`);
      }
    } catch (err) {
      console.error(`\n❌ ${style.label} failed:`, err.message);
      if (!allFlag) process.exit(1);
    }
  }

  console.log('\n🎉 Done! Run `npm run dev` to test the hero scrubber.');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
