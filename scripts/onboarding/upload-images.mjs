#!/usr/bin/env node
/**
 * Download scraped images, optimize with sharp, and upload to Supabase Storage.
 * Usage: node upload-images.mjs --site-id example-reno --data /tmp/scraped.json --output /tmp/provisioned.json
 */

import { createClient } from '@supabase/supabase-js';
import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

function loadEnv() {
  for (const envFile of ['.env.local', resolve(process.env.HOME, 'pipeline/scripts/.env')]) {
    try {
      const content = readFileSync(resolve(process.cwd(), envFile), 'utf-8');
      for (const line of content.split('\n')) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          if (!process.env[key]) {
            process.env[key] = match[2].trim().replace(/^["']|["']$/g, '');
          }
        }
      }
    } catch { /* ignore */ }
  }
}

loadEnv();

const { values: args } = parseArgs({
  options: {
    'site-id': { type: 'string' },
    data: { type: 'string' },
    output: { type: 'string' },
    'skip-optimize': { type: 'boolean', default: false },
    help: { type: 'boolean' },
  },
});

if (args.help || !args['site-id'] || !args.data || !args.output) {
  console.log('Usage: node upload-images.mjs --site-id example-reno --data /tmp/scraped.json --output /tmp/provisioned.json');
  console.log('Options:');
  console.log('  --skip-optimize    Upload originals without sharp optimization');
  process.exit(args.help ? 0 : 1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const siteId = args['site-id'];
const data = JSON.parse(readFileSync(args.data, 'utf-8'));
const skipOptimize = args['skip-optimize'];

console.log(`\nUploading images for tenant: ${siteId}`);
if (skipOptimize) console.log('  (optimization disabled — uploading originals)');
console.log('─'.repeat(50));

const urlMapping = {};
const failedUploads = [];
let totalOriginalKB = 0;
let totalOptimizedKB = 0;

// ─── Image Optimization ────────────────────────────────────────────────────

// Size limits per image type
const SIZE_LIMITS = {
  hero:      { maxWidth: 1920, maxHeight: 1080 },
  logo:      { maxWidth: 600,  maxHeight: 600 },
  about:     { maxWidth: 1200, maxHeight: 800 },
  team:      { maxWidth: 400,  maxHeight: 400 },
  portfolio: { maxWidth: 1200, maxHeight: 900 },
  service:   { maxWidth: 800,  maxHeight: 600 },
};

/**
 * Optimize image buffer with sharp.
 * Converts to WebP (except SVGs), resizes to max dimensions.
 */
async function optimizeImage(buffer, contentType, imageType) {
  if (skipOptimize) return { buffer, contentType, ext: null };

  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Skip SVGs — they don't need rasterization
    if (metadata.format === 'svg' || contentType === 'image/svg+xml') {
      return { buffer, contentType: 'image/svg+xml', ext: 'svg' };
    }

    const limits = SIZE_LIMITS[imageType] || SIZE_LIMITS.portfolio;
    const originalKB = buffer.length / 1024;

    // Skip if already small enough (under limits and under 500KB)
    if (
      metadata.width <= limits.maxWidth &&
      metadata.height <= limits.maxHeight &&
      buffer.length < 500_000
    ) {
      return { buffer, contentType: `image/${metadata.format}`, ext: null };
    }

    // Resize and convert to WebP
    const optimized = await image
      .resize(limits.maxWidth, limits.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();

    const optimizedKB = optimized.length / 1024;
    const savings = ((1 - optimizedKB / originalKB) * 100).toFixed(0);
    console.log(`    Optimized: ${originalKB.toFixed(0)}KB → ${optimizedKB.toFixed(0)}KB (${savings}% smaller)`);

    totalOriginalKB += originalKB;
    totalOptimizedKB += optimizedKB;

    return { buffer: optimized, contentType: 'image/webp', ext: 'webp' };
  } catch (e) {
    console.log(`    Optimization failed: ${e.message}. Using original.`);
    return { buffer, contentType, ext: null };
  }
}

// ─── Download + Optimize + Upload ──────────────────────────────────────────

async function downloadAndUpload(url, storagePath, imageType = 'portfolio') {
  if (!url || url.trim() === '') return null;
  try {
    let buffer;
    let contentType = 'image/jpeg';

    if (url.startsWith('/') || url.startsWith('file://')) {
      // Local file path (from logo extraction levels 3-4)
      const filePath = url.startsWith('file://') ? url.slice(7) : url;
      console.log(`  Reading local file: ${filePath}`);
      try {
        buffer = await readFile(filePath);
      } catch (e) {
        console.log(`    Failed to read local file: ${e.message}`);
        return null;
      }
      const ext = filePath.match(/\.(svg|png|jpg|jpeg|webp)$/i)?.[1]?.toLowerCase() || 'png';
      contentType = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    } else {
      console.log(`  Downloading: ${url.substring(0, 80)}...`);
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) {
        console.log(`    Failed: HTTP ${response.status}`);
        return null;
      }
      contentType = response.headers.get('content-type') || 'image/jpeg';
      // Reject non-image responses (e.g. HTML pages scraped as image URLs)
      if (!contentType.startsWith('image/') && !contentType.startsWith('application/octet-stream')) {
        console.log(`    Skipping: not an image (content-type: ${contentType})`);
        return null;
      }
      buffer = Buffer.from(await response.arrayBuffer());
    }

    // Size guardrail: skip files > 10MB
    if (buffer.length > 10 * 1024 * 1024) {
      console.log(`    Skipping: file too large (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);
      return null;
    }

    // Optimize with sharp
    const { buffer: optimized, contentType: optType, ext: optExt } = await optimizeImage(buffer, contentType, imageType);

    // Determine final storage path (change extension to .webp if optimized)
    let finalPath = storagePath;
    if (optExt) {
      finalPath = storagePath.replace(/\.(jpg|jpeg|png|webp)$/i, `.${optExt}`);
    }

    const fullPath = `${siteId}/${finalPath}`;
    console.log(`  Uploading: ${fullPath} (${(optimized.length / 1024).toFixed(0)}KB)`);

    const { error } = await supabase.storage
      .from('tenant-assets')
      .upload(fullPath, optimized, {
        contentType: optType,
        upsert: true,
      });

    if (error) {
      console.log(`    Upload failed: ${error.message}`);
      return null;
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/tenant-assets/${fullPath}`;
    urlMapping[url] = publicUrl;
    return publicUrl;
  } catch (e) {
    console.log(`    Error: ${e.message}`);
    return null;
  }
}

// ─── Upload all image categories ────────────────────────────────────────────

// Upload hero image
if (data.hero_image_url) {
  const ext = data.hero_image_url.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
  const newUrl = await downloadAndUpload(data.hero_image_url, `hero.${ext}`, 'hero');
  if (newUrl) {
    data.hero_image_url = newUrl;
  } else {
    console.log(`  Clearing failed hero_image_url: ${data.hero_image_url.substring(0, 80)}`);
    failedUploads.push({ type: 'hero', originalUrl: data.hero_image_url });
    data.hero_image_url = '';
  }
}

// Upload logo
if (data.logo_url) {
  const ext = data.logo_url.match(/\.(svg|png|jpg|jpeg|webp)/i)?.[1] || 'png';
  const newUrl = await downloadAndUpload(data.logo_url, `logo.${ext}`, 'logo');
  if (newUrl) {
    data.logo_url = newUrl;
  } else {
    console.log(`  Clearing failed logo_url: ${data.logo_url.substring(0, 80)}`);
    failedUploads.push({ type: 'logo', originalUrl: data.logo_url });
    data.logo_url = '';
  }
}

// Upload about image
if (data.about_image_url) {
  const ext = data.about_image_url.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
  const newUrl = await downloadAndUpload(data.about_image_url, `about.${ext}`, 'about');
  if (newUrl) {
    data.about_image_url = newUrl;
  } else {
    console.log(`  Clearing failed about_image_url: ${data.about_image_url.substring(0, 80)}`);
    failedUploads.push({ type: 'about', originalUrl: data.about_image_url });
    data.about_image_url = '';
  }
}

// Upload team photos
if (data.team_members?.length > 0) {
  for (let i = 0; i < data.team_members.length; i++) {
    const member = data.team_members[i];
    if (member.photo_url) {
      const ext = member.photo_url.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
      const newUrl = await downloadAndUpload(member.photo_url, `team/${i}.${ext}`, 'team');
      if (newUrl) member.photo_url = newUrl;
    }
  }
}

// Upload portfolio images
if (data.portfolio?.length > 0) {
  for (let i = 0; i < data.portfolio.length; i++) {
    const project = data.portfolio[i];
    if (project.image_url) {
      const ext = project.image_url.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
      const newUrl = await downloadAndUpload(project.image_url, `portfolio/${i}.${ext}`, 'portfolio');
      if (newUrl) {
        project.image_url = newUrl;
      } else {
        // Clear broken/non-image URLs rather than keeping them (they cause broken images in the platform)
        failedUploads.push({ type: `portfolio[${i}]`, originalUrl: project.image_url });
        project.image_url = '';
      }
    }
  }
}

// Upload service images
if (data.services?.length > 0) {
  for (let i = 0; i < data.services.length; i++) {
    const service = data.services[i];
    const imgUrl = service.image_urls?.[0];
    if (imgUrl) {
      const slug = service.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `service-${i}`;
      const ext = imgUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
      const newUrl = await downloadAndUpload(imgUrl, `services/${slug}.${ext}`, 'service');
      if (newUrl) {
        service.image_urls[0] = newUrl;
      }
    }
  }
}

// ─── Summary ────────────────────────────────────────────────────────────────

const imageCount = Object.keys(urlMapping).length;
console.log(`\nUploaded ${imageCount} images`);

if (!skipOptimize && totalOriginalKB > 0) {
  const totalSavings = ((1 - totalOptimizedKB / totalOriginalKB) * 100).toFixed(0);
  console.log(`Total savings: ${totalOriginalKB.toFixed(0)}KB → ${totalOptimizedKB.toFixed(0)}KB (${totalSavings}% reduction)`);
}

if (failedUploads.length > 0) {
  console.log(`\nFailed uploads (${failedUploads.length}):`);
  for (const f of failedUploads) {
    console.log(`  ${f.type}: ${f.originalUrl.substring(0, 80)}`);
  }
  data._upload_failures = failedUploads;
}

// Write updated data
writeFileSync(args.output, JSON.stringify(data, null, 2));
console.log(`Output written to: ${args.output}`);
