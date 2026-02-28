#!/usr/bin/env node
/**
 * One-time Gmail OAuth2 setup for the outreach pipeline.
 *
 * Creates the refresh token needed by create-draft.mjs to create
 * real Gmail drafts via the Gmail REST API.
 *
 * Prerequisites:
 *   1. Go to https://console.cloud.google.com/apis/credentials
 *   2. Create a project (or select existing)
 *   3. Enable the Gmail API: https://console.cloud.google.com/apis/library/gmail.googleapis.com
 *   4. Create OAuth 2.0 credentials → Desktop app
 *   5. Copy the Client ID and Client Secret
 *   6. Add to ~/pipeline/scripts/.env:
 *        GMAIL_CLIENT_ID=<your-client-id>
 *        GMAIL_CLIENT_SECRET=<your-client-secret>
 *
 * Usage:
 *   node scripts/outreach/gmail-auth-setup.mjs
 *
 * What it does:
 *   1. Opens Google consent screen in your browser
 *   2. You authorize the app to manage Gmail drafts
 *   3. Prints the GMAIL_REFRESH_TOKEN to add to your .env
 */

import { createServer } from 'node:http';
import { URL } from 'node:url';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const DEMO_ROOT = resolve(import.meta.dirname, '../../');
const { loadEnv } = await import(resolve(DEMO_ROOT, 'tenant-builder/lib/env-loader.mjs'));
loadEnv();

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(`
Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET.

Setup steps:
  1. Go to https://console.cloud.google.com/apis/credentials
  2. Create a project (or select existing)
  3. Enable Gmail API: https://console.cloud.google.com/apis/library/gmail.googleapis.com
  4. Create OAuth 2.0 credentials → Desktop app
  5. Add to ~/pipeline/scripts/.env:
       GMAIL_CLIENT_ID=<your-client-id>
       GMAIL_CLIENT_SECRET=<your-client-secret>
  6. Re-run this script
`);
  process.exit(1);
}

const PORT = 8914;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPES = 'https://www.googleapis.com/auth/gmail.compose';

// Build the authorization URL
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPES);
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');

console.log('Opening browser for Google authorization...\n');

// Start local server to catch the callback
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname !== '/callback') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<h1>Authorization failed</h1><p>${error}</p>`);
    console.error(`Authorization failed: ${error}`);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end('<h1>Missing authorization code</h1>');
    return;
  }

  // Exchange code for tokens
  try {
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResp.ok) {
      const err = await tokenResp.text();
      throw new Error(`Token exchange failed (${tokenResp.status}): ${err}`);
    }

    const tokens = await tokenResp.json();

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Success!</h1><p>You can close this tab. Check the terminal for next steps.</p>');

    console.log('\nAuthorization successful!\n');
    console.log('Add this to ~/pipeline/scripts/.env:\n');
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}\n`);
    console.log('Then test with:');
    console.log('  node scripts/outreach/outreach-pipeline.mjs --target-id 22 --dry-run\n');
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(`<h1>Error</h1><p>${e.message}</p>`);
    console.error(`Token exchange error: ${e.message}`);
  }

  server.close();
  process.exit(0);
});

server.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}/callback\n`);

  // Open browser
  try {
    execSync(`open "${authUrl.toString()}"`, { stdio: 'ignore' });
  } catch {
    console.log('Could not open browser automatically. Open this URL manually:\n');
    console.log(authUrl.toString());
    console.log();
  }
});

// Timeout after 5 minutes
setTimeout(() => {
  console.error('\nTimeout waiting for authorization (5 min). Try again.');
  server.close();
  process.exit(1);
}, 300000);
