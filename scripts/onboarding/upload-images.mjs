#!/usr/bin/env node
/**
 * Download scraped images and upload to Supabase Storage.
 * Usage: node upload-images.mjs --site-id example-reno --data /tmp/scraped.json --output /tmp/provisioned.json
 */

import { createClient } from '@supabase/supabase-js';
import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv() {
  // Load from .env.local first (Supabase demo project), then pipeline env (API keys)
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
    help: { type: 'boolean' },
  },
});

if (args.help || !args['site-id'] || !args.data || !args.output) {
  console.log('Usage: node upload-images.mjs --site-id example-reno --data /tmp/scraped.json --output /tmp/provisioned.json');
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

console.log(`\nUploading images for tenant: ${siteId}`);
console.log('\u2500'.repeat(50));

const urlMapping = {};

async function downloadAndUpload(url, storagePath) {
  if (!url || url.trim() === '') return null;
  try {
    console.log(`  Downloading: ${url.substring(0, 80)}...`);
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`    Failed: HTTP ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());
    const fullPath = `${siteId}/${storagePath}`;

    console.log(`  Uploading: ${fullPath} (${(buffer.length / 1024).toFixed(0)}KB)`);
    const { error } = await supabase.storage
      .from('tenant-assets')
      .upload(fullPath, buffer, {
        contentType,
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

// Upload hero image
if (data.hero_image_url) {
  const ext = data.hero_image_url.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
  const newUrl = await downloadAndUpload(data.hero_image_url, `hero.${ext}`);
  if (newUrl) data.hero_image_url = newUrl;
}

// Upload logo
if (data.logo_url) {
  const ext = data.logo_url.match(/\.(svg|png|jpg|jpeg|webp)/i)?.[1] || 'png';
  const newUrl = await downloadAndUpload(data.logo_url, `logo.${ext}`);
  if (newUrl) data.logo_url = newUrl;
}

// Upload about image
if (data.about_image_url) {
  const ext = data.about_image_url.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
  const newUrl = await downloadAndUpload(data.about_image_url, `about.${ext}`);
  if (newUrl) data.about_image_url = newUrl;
}

// Upload team photos
if (data.team_members?.length > 0) {
  for (let i = 0; i < data.team_members.length; i++) {
    const member = data.team_members[i];
    if (member.photo_url) {
      const ext = member.photo_url.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
      const newUrl = await downloadAndUpload(member.photo_url, `team/${i}.${ext}`);
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
      const newUrl = await downloadAndUpload(project.image_url, `portfolio/${i}.${ext}`);
      if (newUrl) project.image_url = newUrl;
    }
  }
}

console.log(`\nUploaded ${Object.keys(urlMapping).length} images`);

// Write updated data
writeFileSync(args.output, JSON.stringify(data, null, 2));
console.log(`Output written to: ${args.output}`);
