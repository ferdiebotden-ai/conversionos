#!/usr/bin/env node
/**
 * Gmail draft creator via Gmail REST API (OAuth2).
 * Creates real Gmail drafts that appear in the Drafts folder.
 *
 * Requires: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
 * One-time setup: node scripts/outreach/gmail-auth-setup.mjs
 *
 * Usage:
 *   import { createGmailDraft } from './create-draft.mjs';
 *   const { messageId, draftId, success } = await createGmailDraft({ to, subject, textBody, htmlBody });
 */

import { randomUUID } from 'node:crypto';

// ──────────────────────────────────────────────────────────
// MIME message builder (RFC 2822)
// ──────────────────────────────────────────────────────────

/**
 * Build a multipart/alternative MIME message.
 * Returns { mimeString, messageId }.
 */
export function buildMimeMessage({ to, subject, textBody, htmlBody }) {
  const messageId = `<${randomUUID()}@outreach.norbotsystems.com>`;
  const boundary = `----=_Part_${randomUUID().replace(/-/g, '')}`;
  const date = new Date().toUTCString();

  const headers = [
    `From: Ferdie Botden <ferdie@norbotsystems.com>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Message-ID: ${messageId}`,
    `Date: ${date}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].join('\r\n');

  const textPart = [
    `--${boundary}`,
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: quoted-printable`,
    '',
    quotedPrintableEncode(textBody),
  ].join('\r\n');

  const htmlPart = [
    `--${boundary}`,
    `Content-Type: text/html; charset=utf-8`,
    `Content-Transfer-Encoding: quoted-printable`,
    '',
    quotedPrintableEncode(htmlBody),
  ].join('\r\n');

  const mimeString = [
    headers,
    '',
    textPart,
    htmlPart,
    `--${boundary}--`,
    '',
  ].join('\r\n');

  return { mimeString, messageId };
}

/**
 * Quoted-printable encode (RFC 2045).
 * Encodes non-ASCII and special chars, wraps at 76 chars.
 */
function quotedPrintableEncode(str) {
  return str.replace(/[^\t\n\r -~]/g, (ch) => {
    const code = ch.charCodeAt(0);
    if (code < 256) {
      return '=' + code.toString(16).toUpperCase().padStart(2, '0');
    }
    // Multi-byte: encode as UTF-8 bytes
    const buf = Buffer.from(ch, 'utf-8');
    return Array.from(buf).map(b => '=' + b.toString(16).toUpperCase().padStart(2, '0')).join('');
  }).replace(/=\r?\n/g, '=0A'); // Preserve soft line breaks
}

// ──────────────────────────────────────────────────────────
// Gmail REST API (OAuth2)
// ──────────────────────────────────────────────────────────

/**
 * Exchange a refresh token for an access token.
 */
async function getAccessToken(clientId, clientSecret, refreshToken) {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OAuth2 token refresh failed (${resp.status}): ${err}`);
  }

  const data = await resp.json();
  return data.access_token;
}

/**
 * Create a Gmail draft via the REST API.
 * Returns { success, messageId, draftId, gmailMessageId, error }.
 */
export async function createGmailDraft(email, credentials) {
  const { mimeString, messageId } = buildMimeMessage(email);

  const { clientId, clientSecret, refreshToken } = credentials;
  if (!clientId || !clientSecret || !refreshToken) {
    return {
      success: false,
      messageId,
      error: 'Missing Gmail API credentials (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN). Run: node scripts/outreach/gmail-auth-setup.mjs',
    };
  }

  try {
    const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

    // base64url encode the MIME message (Gmail API requirement)
    const raw = Buffer.from(mimeString).toString('base64url');

    const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: { raw } }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return {
        success: false,
        messageId,
        error: `Gmail API ${resp.status}: ${err}`,
      };
    }

    const data = await resp.json();
    return {
      success: true,
      messageId,
      draftId: data.id,
      gmailMessageId: data.message?.id,
    };
  } catch (e) {
    return {
      success: false,
      messageId,
      error: e.message,
    };
  }
}
