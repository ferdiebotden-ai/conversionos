#!/usr/bin/env node

/**
 * interpolate-hero-frames.mjs
 *
 * Doubles frame count from 80 → 160 using FFmpeg minterpolate (optical flow)
 * and converts output to WebP for smaller file size.
 *
 * Usage:
 *   node scripts/interpolate-hero-frames.mjs --style modern
 *   node scripts/interpolate-hero-frames.mjs --all
 *   node scripts/interpolate-hero-frames.mjs --all --dry-run
 */

import { existsSync, readdirSync, mkdirSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Config ────────────────────────────────────────────────────────

const STYLES = [
  { label: 'Modern', slug: 'modern' },
  { label: 'Transitional', slug: 'transitional' },
  { label: 'Farmhouse', slug: 'farmhouse' },
  { label: 'Industrial', slug: 'industrial' },
  { label: 'Scandinavian', slug: 'scandinavian' },
];

const SOURCE_FPS = 10;
const TARGET_FPS = 20;
const TARGET_FRAMES = 160;
const WEBP_QUALITY = 80;
const FRAME_WIDTH = 800;

// ── Parse args ────────────────────────────────────────────────────

const args = process.argv.slice(2);
const styleArg = args.includes('--style') ? args[args.indexOf('--style') + 1] : null;
const allFlag = args.includes('--all');
const dryRun = args.includes('--dry-run');
const keepJpeg = args.includes('--keep-jpeg');

if (!styleArg && !allFlag) {
  console.log('Usage: node scripts/interpolate-hero-frames.mjs --style <slug> | --all');
  console.log('Flags: --dry-run, --keep-jpeg');
  console.log('Styles:', STYLES.map(s => s.slug).join(', '));
  process.exit(0);
}

const stylesToProcess = allFlag ? STYLES : STYLES.filter(s => s.slug === styleArg);
if (stylesToProcess.length === 0) {
  console.error(`Unknown style: ${styleArg}`);
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────

function run(cmd, label) {
  console.log(`   $ ${cmd}`);
  if (dryRun) {
    console.log('   [DRY RUN] skipped');
    return;
  }
  try {
    execSync(cmd, { stdio: 'pipe', maxBuffer: 50 * 1024 * 1024 });
  } catch (err) {
    console.error(`   ❌ ${label} failed:`, err.stderr?.toString().slice(0, 500) || err.message);
    throw err;
  }
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log('🎞️  Hero Frame Interpolation Pipeline');
  console.log(`   Source: ${SOURCE_FPS}fps (80 JPEG) → Target: ${TARGET_FPS}fps (${TARGET_FRAMES} WebP)`);
  console.log(`   WebP quality: ${WEBP_QUALITY} | Width: ${FRAME_WIDTH}px`);
  if (dryRun) console.log('   🔸 DRY RUN — no files will be modified\n');

  for (const style of stylesToProcess) {
    const frameDir = resolve(ROOT, `public/images/hero/frames/${style.slug}`);
    const tmpDir = `/tmp/hero-interpolate-${style.slug}`;

    console.log(`\n━━━ ${style.label} ━━━`);

    // Verify source frames exist
    if (!existsSync(frameDir)) {
      console.log(`   ⚠️  No frame directory: ${frameDir} — skipping`);
      continue;
    }

    const sourceFrames = readdirSync(frameDir).filter(f => f.endsWith('.jpg'));
    if (sourceFrames.length < 20) {
      console.log(`   ⚠️  Only ${sourceFrames.length} source JPEG frames — need at least 20. Skipping.`);
      continue;
    }
    console.log(`   📂 Source: ${sourceFrames.length} JPEG frames`);

    if (!dryRun) mkdirSync(tmpDir, { recursive: true });

    // Step 1: Reassemble source JPEGs into a video at source FPS
    console.log('\n   Step 1: Reassemble frames → MP4');
    const inputMp4 = `${tmpDir}/input.mp4`;
    run(
      `ffmpeg -y -framerate ${SOURCE_FPS} -i "${frameDir}/frame_%03d.jpg" -c:v libx264 -pix_fmt yuv420p -crf 15 "${inputMp4}"`,
      'reassemble'
    );

    // Step 2: Optical flow interpolation to double frame rate
    console.log('\n   Step 2: Optical flow interpolation (minterpolate)');
    const interpolatedMp4 = `${tmpDir}/interpolated.mp4`;
    run(
      `ffmpeg -y -i "${inputMp4}" -filter:v "minterpolate=fps=${TARGET_FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1" -c:v libx264 -pix_fmt yuv420p -crf 15 "${interpolatedMp4}"`,
      'minterpolate'
    );

    // Step 3: Extract target frame count as temporary JPEGs
    console.log('\n   Step 3: Extract interpolated frames');
    const extractDir = `${tmpDir}/extracted`;
    if (!dryRun) mkdirSync(extractDir, { recursive: true });
    run(
      `ffmpeg -y -i "${interpolatedMp4}" -vf "scale=${FRAME_WIDTH}:-1" -frames:v ${TARGET_FRAMES} -q:v 2 -start_number 0 "${extractDir}/frame_%03d.jpg"`,
      'extract'
    );

    if (dryRun) {
      console.log(`   ✅ [DRY RUN] Would produce ${TARGET_FRAMES} WebP frames in ${frameDir}/`);
      continue;
    }

    // Verify extraction count
    const extractedFrames = readdirSync(extractDir).filter(f => f.endsWith('.jpg'));
    console.log(`   📊 Extracted: ${extractedFrames.length} frames`);

    if (extractedFrames.length < TARGET_FRAMES) {
      console.log(`   ⚠️  Only got ${extractedFrames.length} frames (wanted ${TARGET_FRAMES}). Using what we have.`);
    }

    // Step 4: Convert to WebP
    console.log('\n   Step 4: Convert to WebP');
    let converted = 0;
    for (const jpgFile of extractedFrames) {
      const idx = jpgFile.replace('frame_', '').replace('.jpg', '');
      const srcPath = `${extractDir}/${jpgFile}`;
      const dstPath = `${frameDir}/frame_${idx}.webp`;
      try {
        execSync(`cwebp -q ${WEBP_QUALITY} "${srcPath}" -o "${dstPath}" -quiet`, { stdio: 'pipe' });
        converted++;
      } catch (err) {
        console.error(`   ❌ cwebp failed for frame_${idx}: ${err.message}`);
      }
    }
    console.log(`   ✅ Converted: ${converted} WebP frames`);

    // Step 5: Clean up old JPEGs from the frame directory (unless --keep-jpeg)
    if (!keepJpeg) {
      console.log('\n   Step 5: Remove old JPEG frames');
      let removed = 0;
      for (const f of readdirSync(frameDir).filter(f => f.endsWith('.jpg'))) {
        try {
          unlinkSync(resolve(frameDir, f));
          removed++;
        } catch {}
      }
      console.log(`   🗑️  Removed: ${removed} old JPEG files`);
    }

    // Clean up tmp
    try {
      execSync(`rm -rf "${tmpDir}"`, { stdio: 'pipe' });
    } catch {}

    // Final count
    const finalFrames = readdirSync(frameDir).filter(f => f.endsWith('.webp'));
    const totalSize = finalFrames.reduce((sum, f) => {
      try {
        const stat = execSync(`stat -f%z "${resolve(frameDir, f)}"`, { encoding: 'utf8' });
        return sum + parseInt(stat.trim(), 10);
      } catch { return sum; }
    }, 0);
    console.log(`\n   ✅ ${style.label}: ${finalFrames.length} WebP frames (${(totalSize / 1024 / 1024).toFixed(1)} MB)`);
  }

  console.log('\n🎉 Done! Run `npm run dev` to test the hero scrubber.');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
