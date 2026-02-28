#!/usr/bin/env node
/**
 * Email template filler — NOT a "generate from scratch" module.
 * Fills Ferdie's exact template with target data from Turso.
 *
 * Usage:
 *   import { generateEmail } from './generate-email.mjs';
 *   const email = await generateEmail(target, { previewSlot: '10:30am' });
 */

import { resolve } from 'node:path';

// ──────────────────────────────────────────────────────────
// Ferdie's exact email template
// ──────────────────────────────────────────────────────────

const SUBJECT_TEMPLATE = '{firstName} - Estimate Request Intake (Modern & Custom)';

const BODY_TEMPLATE = `Hey {firstName},

I'm Ferdie out of Stratford and built a custom website for you, it's live, but it's more than just a website — you'll see.

I'll call you {callDay} at {callTime}{phoneClause} to explain who we are and why we chose to build it for you in {city}.

Here is the link, it's live for 48 hours for you to play around with it (please keep it private):
{demoUrl}

If you're curious who we are and what the software can do for you, visit us at www.norbotsystems.com before the call, otherwise I look forward to speaking with you (if a different time works better, just let me know or if there's a better number to reach you).

Talk soon.
Ferdie`;

const SIGNATURE = `—
Ferdie Botden, CPA
Founder, NorBot Systems Inc.
226-444-3478`;

const CASL_FOOTER = `NorBot Systems Inc. | PO Box 23030 Stratford PO Main, ON N5A 7V8
Reply STOP to be removed.`;

// ──────────────────────────────────────────────────────────
// Calendar slot logic
// ──────────────────────────────────────────────────────────

/**
 * Determine the call day label.
 * If the next business day is tomorrow → "tomorrow"
 * Otherwise → day name ("Monday", "Tuesday", etc.)
 */
export function getCallDayLabel(fromDate = new Date()) {
  const nextBiz = getNextBusinessDay(fromDate);
  const tomorrow = new Date(fromDate);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (
    nextBiz.getFullYear() === tomorrow.getFullYear() &&
    nextBiz.getMonth() === tomorrow.getMonth() &&
    nextBiz.getDate() === tomorrow.getDate()
  ) {
    return 'tomorrow';
  }

  return nextBiz.toLocaleDateString('en-CA', { weekday: 'long' });
}

/**
 * Get the next business day (Mon-Fri) from a given date.
 */
export function getNextBusinessDay(fromDate = new Date()) {
  const next = new Date(fromDate);
  next.setDate(next.getDate() + 1);
  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

/**
 * Available call slots: 9:30am to 3:30pm, 30-min intervals, skip noon.
 */
export const CALL_SLOTS = [
  '9:30am', '10:00am', '10:30am', '11:00am', '11:30am',
  '1:00pm', '1:30pm', '2:00pm', '2:30pm', '3:00pm',
];

/**
 * Format a slot time for display.
 */
export function formatSlotTime(slot) {
  return slot; // Already human-friendly ("10:30am")
}

// ──────────────────────────────────────────────────────────
// Template filling
// ──────────────────────────────────────────────────────────

/**
 * Extract first name from owner_name, or default to "there".
 */
const SENTINEL_NAMES = new Set([
  'not specified', 'not applicable', 'not provided', 'n/a', 'na', 'unknown', 'none', 'owner',
]);

export function getFirstName(ownerName) {
  if (!ownerName || ownerName.trim().length === 0) return 'there';
  const trimmed = ownerName.trim();
  if (SENTINEL_NAMES.has(trimmed.toLowerCase())) return 'there';
  const first = trimmed.split(/\s+/)[0];
  // Reject single-char names or names that look like placeholders
  if (first.length <= 1) return 'there';
  return first;
}

/**
 * Generate the email for a target.
 *
 * @param {object} target — Turso target row
 * @param {object} options
 * @param {string} [options.previewSlot] — e.g. "10:30am" (from calendar slot finder)
 * @param {string} [options.siteId] — override site_id (defaults to target.slug)
 * @returns {{ to, subject, textBody, htmlBody, callDay, callTime, firstName }}
 */
export function generateEmail(target, options = {}) {
  const firstName = getFirstName(target.owner_name);
  const city = target.city || 'your area';
  const siteId = options.siteId || target.slug;
  const demoUrl = `https://${siteId}.norbotsystems.com`;
  const callDay = getCallDayLabel();
  const callTime = options.previewSlot || '10:30am';

  // Phone clause: include phone number if available, otherwise omit
  const phoneClause = target.phone
    ? ` at ${target.phone}`
    : '';

  const subject = SUBJECT_TEMPLATE.replace('{firstName}', firstName);

  const textBody = BODY_TEMPLATE
    .replace('{firstName}', firstName)
    .replace('{callDay}', callDay)
    .replace('{callTime}', callTime)
    .replace('{phoneClause}', phoneClause)
    .replace('{city}', city)
    .replace('{demoUrl}', demoUrl);

  const fullTextBody = `${textBody}\n\n${SIGNATURE}\n\n${CASL_FOOTER}`;
  const htmlBody = textToHtml(textBody, SIGNATURE, CASL_FOOTER);

  return {
    to: target.email,
    subject,
    textBody: fullTextBody,
    htmlBody,
    callDay,
    callTime,
    firstName,
    demoUrl,
    siteId,
  };
}

// ──────────────────────────────────────────────────────────
// Quality gates
// ──────────────────────────────────────────────────────────

/**
 * Validate the generated email. Returns { valid, issues }.
 */
export function validateEmail(email) {
  const issues = [];

  if (!email.to || !email.to.includes('@')) {
    issues.push('Invalid or missing email address');
  }

  if (!email.subject || email.subject.includes('{')) {
    issues.push('Subject contains unfilled template variables');
  }

  if (email.textBody.includes('{') && email.textBody.includes('}')) {
    // Check for actual template vars, not JSON or URLs
    const templateVars = email.textBody.match(/\{[a-zA-Z]+\}/g);
    if (templateVars) {
      issues.push(`Unfilled template variables: ${templateVars.join(', ')}`);
    }
  }

  if (!email.textBody.includes('STOP')) {
    issues.push('Missing CASL unsubscribe mechanism');
  }

  if (!email.textBody.includes('NorBot Systems')) {
    issues.push('Missing business name in CASL footer');
  }

  if (!email.textBody.includes('PO Box 23030')) {
    issues.push('Missing address in CASL footer');
  }

  // Word count (body only, excluding signature and footer)
  const bodyWords = email.textBody.split(/\s+/).length;
  if (bodyWords > 250) {
    issues.push(`Email too long: ${bodyWords} words (max 250)`);
  }

  return { valid: issues.length === 0, issues };
}

// ──────────────────────────────────────────────────────────
// HTML conversion (ported from Python create_mail_drafts.py)
// ──────────────────────────────────────────────────────────

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Convert plain text email to HTML.
 * Looks like a hand-typed email — system font, no logos.
 */
export function textToHtml(body, signature, caslFooter) {
  let escaped = escapeHtml(body);

  // Convert bare URLs to clickable links
  escaped = escaped.replace(
    /(?<!href=")(https?:\/\/\S+)/g,
    '<a href="$1" style="color:#2563eb;text-decoration:underline">$1</a>'
  );

  // Convert www.norbotsystems.com to clickable link
  escaped = escaped.replace(
    /(?<!href=")(www\.norbotsystems\.com)/g,
    '<a href="https://$1" style="color:#2563eb;text-decoration:underline">$1</a>'
  );

  // Double newlines → paragraph breaks
  const paragraphs = escaped.split(/\n\n+/);
  const htmlBody = paragraphs
    .filter(p => p.trim())
    .map(p => `<p style="margin:0 0 16px 0">${p.trim().replace(/\n/g, '<br>\n')}</p>`)
    .join('\n');

  // Signature block (table-based for cross-client reliability)
  const sigHtml = `
<table cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;border-top:1px solid #d1d5db;padding-top:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<tr><td style="line-height:1.5">
<strong style="font-size:14px;color:#1a1a1a">Ferdie Botden, CPA</strong><br>
<span style="font-size:13px;color:#6b7280">Founder, NorBot Systems Inc.</span><br>
<span style="font-size:13px;color:#6b7280">226-444-3478</span><br>
<a href="https://www.norbotsystems.com" style="font-size:13px;color:#2563eb;text-decoration:none">norbotsystems.com</a>
</td></tr>
</table>`;

  // CASL footer - muted
  const caslHtml = caslFooter
    ? `\n<hr style="border:none;border-top:1px solid #9ca3af;margin:24px 0 12px">\n<p style="font-size:12px;line-height:1.4;opacity:0.5">${escapeHtml(caslFooter).replace(/\n/g, '<br>')}</p>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.6;max-width:600px">
${htmlBody}
${sigHtml}
${caslHtml}
</body>
</html>`;
}

export { SUBJECT_TEMPLATE, BODY_TEMPLATE, SIGNATURE, CASL_FOOTER };
