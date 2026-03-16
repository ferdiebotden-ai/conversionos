#!/usr/bin/env node
/**
 * Upload generated artifacts to Vercel Blob storage.
 *
 * Usage:
 *   node scripts/upload_blob.cjs <slug> <date> <outbox_dir>
 *
 * Reads BLOB_READ_WRITE_TOKEN from dashboard/.env.local.
 * Uploads microsite, email, and call script files.
 * Prints JSON to stdout with Blob URLs for Python to parse.
 */

const fs = require('fs');
const path = require('path');

const DASHBOARD_DIR = path.join(__dirname, '..', 'dashboard');
const ENV_PATH = path.join(DASHBOARD_DIR, '.env.local');

// Load BLOB_READ_WRITE_TOKEN from dashboard/.env.local
function loadBlobToken() {
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error(`Missing ${ENV_PATH}`);
  }
  const content = fs.readFileSync(ENV_PATH, 'utf-8');
  for (const line of content.split('\n')) {
    const clean = line.replace(/\r/g, '').trim();
    if (clean.startsWith('BLOB_READ_WRITE_TOKEN=')) {
      const val = clean.split('=').slice(1).join('=').replace(/^["']|["']$/g, '');
      return val;
    }
  }
  throw new Error('BLOB_READ_WRITE_TOKEN not found in dashboard/.env.local');
}

async function main() {
  const [slug, dateStr, outboxDir] = process.argv.slice(2);

  if (!slug || !dateStr || !outboxDir) {
    console.error('Usage: node scripts/upload_blob.cjs <slug> <date> <outbox_dir>');
    process.exit(1);
  }

  process.env.BLOB_READ_WRITE_TOKEN = loadBlobToken();

  // Dynamic import of @vercel/blob (ESM-compatible CJS require)
  const { put } = require(path.join(DASHBOARD_DIR, 'node_modules', '@vercel', 'blob'));

  const prefix = `artifacts/${dateStr}/${slug}`;
  const results = {};

  // Upload microsite
  const micrositePath = path.join(outboxDir, 'microsite', 'index.html');
  if (fs.existsSync(micrositePath)) {
    const content = fs.readFileSync(micrositePath, 'utf-8');
    const blob = await put(`${prefix}/microsite/index.html`, content, {
      access: 'public',
      contentType: 'text/html',
      allowOverwrite: true,
    });
    results.microsite = blob.url;
  }

  // Upload email draft
  const emailPath = path.join(outboxDir, 'email_draft.md');
  if (fs.existsSync(emailPath)) {
    const content = fs.readFileSync(emailPath, 'utf-8');
    const blob = await put(`${prefix}/email_draft.md`, content, {
      access: 'public',
      contentType: 'text/markdown',
      allowOverwrite: true,
    });
    results.email = blob.url;
  }

  // Upload call script
  const callPath = path.join(outboxDir, 'call_script.md');
  if (fs.existsSync(callPath)) {
    const content = fs.readFileSync(callPath, 'utf-8');
    const blob = await put(`${prefix}/call_script.md`, content, {
      access: 'public',
      contentType: 'text/markdown',
      allowOverwrite: true,
    });
    results.callScript = blob.url;
  }

  // Print JSON for Python to parse
  console.log(JSON.stringify(results));
}

main().catch(err => {
  console.error(`Upload failed: ${err.message}`);
  process.exit(1);
});
