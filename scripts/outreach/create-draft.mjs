#!/usr/bin/env node
/**
 * Gmail draft creator via IMAP APPEND.
 * Creates drafts only — never sends email.
 *
 * Ported from ~/pipeline/scripts/create_mail_drafts.py
 *
 * Usage:
 *   import { createGmailDraft } from './create-draft.mjs';
 *   const { messageId, success } = await createGmailDraft({ to, subject, textBody, htmlBody });
 */

import { randomUUID } from 'node:crypto';
import * as tls from 'node:tls';
import { resolve } from 'node:path';

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
// Raw IMAP client (minimal, draft-append only)
// ──────────────────────────────────────────────────────────

/**
 * Append a MIME message to Gmail's Drafts folder via IMAP.
 * Returns { success, error }.
 */
export async function appendToGmailDrafts(mimeString, { user, password }) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(993, 'imap.gmail.com', { rejectUnauthorized: false }, () => {
      let tag = 0;
      let buffer = '';
      let state = 'greeting';
      let literalReady = false;

      function send(cmd) {
        tag++;
        const line = `A${tag} ${cmd}\r\n`;
        socket.write(line);
        return `A${tag}`;
      }

      socket.on('data', (data) => {
        buffer += data.toString();

        // Process complete lines
        const lines = buffer.split('\r\n');
        buffer = lines.pop(); // Keep incomplete line

        for (const line of lines) {
          if (state === 'greeting') {
            // Wait for server greeting
            if (line.startsWith('* OK')) {
              state = 'login';
              // Quote credentials for IMAP (handles special chars in passwords)
              send(`LOGIN "${user.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}" "${password.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
            }
          } else if (state === 'login') {
            if (line.includes('OK') && line.startsWith(`A${tag}`)) {
              state = 'append';
              const mimeBytes = Buffer.from(mimeString, 'utf-8');
              // APPEND command with literal size
              tag++;
              socket.write(`A${tag} APPEND "[Gmail]/Drafts" (\\Draft) {${mimeBytes.length}}\r\n`);
              state = 'append-wait';
            } else if (line.includes('NO') || line.includes('BAD')) {
              socket.destroy();
              resolve({ success: false, error: `Login failed: ${line}` });
            }
          } else if (state === 'append-wait') {
            // Server sends + to indicate readiness for literal
            if (line.startsWith('+')) {
              const mimeBytes = Buffer.from(mimeString, 'utf-8');
              socket.write(mimeBytes);
              socket.write('\r\n');
              state = 'append-done';
            }
          } else if (state === 'append-done') {
            if (line.startsWith(`A${tag}`)) {
              if (line.includes('OK')) {
                state = 'logout';
                send('LOGOUT');
              } else {
                socket.destroy();
                resolve({ success: false, error: `APPEND failed: ${line}` });
              }
            }
          } else if (state === 'logout') {
            if (line.startsWith(`A${tag}`) || line.startsWith('* BYE')) {
              socket.destroy();
              resolve({ success: true });
            }
          }
        }
      });

      socket.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      socket.on('close', () => {
        if (state !== 'logout') {
          resolve({ success: false, error: 'Connection closed unexpectedly' });
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        socket.destroy();
        resolve({ success: false, error: 'IMAP timeout (30s)' });
      }, 30000);
    });
  });
}

/**
 * Create a Gmail draft for the given email data.
 * Returns { messageId, success, error }.
 */
export async function createGmailDraft(email, credentials) {
  const { mimeString, messageId } = buildMimeMessage(email);
  const result = await appendToGmailDrafts(mimeString, credentials);
  return { ...result, messageId };
}
