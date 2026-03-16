#!/usr/bin/env node
/**
 * Email template filler — NOT a "generate from scratch" module.
 * Fills Ferdie's exact template with target data from Turso.
 *
 * Usage:
 *   import { generateEmail } from './generate-email.mjs';
 *   const email = generateEmail(target, { previewSlot: '10:30am' });
 */

import { resolve } from 'node:path';

// ──────────────────────────────────────────────────────────
// Ferdie's exact email template — March 2026
// ──────────────────────────────────────────────────────────

const SUBJECT_TEMPLATE = 'Estimate Request \u2014 {city}';

// Rotation alternatives for 3+ targets in same city in one batch
const SUBJECT_ROTATION = [
  '{company_name} \u2014 Custom Estimate Portal',
  '{city} Renovation Website Demo',
];

const BODY_TEMPLATE = `Hi {firstName},

I'm Ferdie out of Stratford \u2014 I built a custom website for {company_name} that captures and qualifies leads for you while you're on a job site.

It's live for 48 hours \u2014 take a look and you'll see your brand, your services, and a working estimate tool under your name (please keep it private):
{demoUrl}

I'll give you a call on {callDay} at {callTime} at {callPhone} to walk you through it \u2014 if there's a better time or number, just let me know.

Talk soon,
Ferdie`;

const SIGNATURE = `\u2014
Ferdie Botden, CPA
Founder, NorBot Systems Inc.
226-444-3478 | norbotsystems.com`;

const CASL_FOOTER = `NorBot Systems Inc. | PO Box 23030 Stratford PO Main, ON N5A 7V8
Reply STOP to be removed.`;

// Terms that must NEVER appear in outreach emails
const BANNED_TERMS = [
  'AI', 'ConversionOS', 'platform', 'free', 'limited time',
  'exclusive', 'guaranteed', 'no obligation',
];

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
 * Available call slots: 9:30am to 3:00pm, 30-min intervals, skip noon.
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
 * @param {number} [options.cityIndex] — 0-based index of this target within its city group (for subject rotation)
 * @param {number} [options.cityCount] — total targets in same city in this batch
 * @returns {{ to, subject, textBody, htmlBody, callDay, callTime, firstName, demoUrl, siteId, skipped, skipReason }}
 */
export function generateEmail(target, options = {}) {
  // HARD STOP: phone is mandatory
  if (!target.phone || target.phone.trim().length === 0) {
    return {
      to: target.email,
      subject: '', textBody: '', htmlBody: '',
      callDay: '', callTime: '', firstName: '', demoUrl: '', siteId: '',
      skipped: true,
      skipReason: 'HARD STOP: missing phone number',
    };
  }

  // HARD STOP: company_name is mandatory
  if (!target.company_name || target.company_name.trim().length === 0) {
    return {
      to: target.email,
      subject: '', textBody: '', htmlBody: '',
      callDay: '', callTime: '', firstName: '', demoUrl: '', siteId: '',
      skipped: true,
      skipReason: 'HARD STOP: missing company_name',
    };
  }

  // HARD STOP: city is mandatory
  if (!target.city || target.city.trim().length === 0) {
    return {
      to: target.email,
      subject: '', textBody: '', htmlBody: '',
      callDay: '', callTime: '', firstName: '', demoUrl: '', siteId: '',
      skipped: true,
      skipReason: 'HARD STOP: missing city',
    };
  }

  const firstName = getFirstName(target.owner_name);
  const city = target.city.trim();
  const companyName = target.company_name.trim();
  const siteId = options.siteId || target.slug;
  const demoUrl = target.demo_url || `https://${siteId}.norbotsystems.com`;
  const callDay = getCallDayLabel();
  const callTime = options.previewSlot || '10:30am';
  const callPhone = target.phone.trim();

  // Subject rotation: if 3+ targets in same city, rotate subject lines
  const cityCount = options.cityCount || 1;
  const cityIndex = options.cityIndex || 0;
  let subject;

  if (cityCount >= 3 && cityIndex > 0) {
    const rotationIdx = (cityIndex - 1) % SUBJECT_ROTATION.length;
    subject = SUBJECT_ROTATION[rotationIdx]
      .replace('{company_name}', companyName)
      .replace('{city}', city);
  } else {
    subject = SUBJECT_TEMPLATE.replace('{city}', city);
  }

  const textBody = BODY_TEMPLATE
    .replace('{firstName}', firstName)
    .replace('{company_name}', companyName)
    .replace('{callDay}', callDay)
    .replace('{callTime}', callTime)
    .replace('{callPhone}', callPhone)
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
    skipped: false,
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

  // Hard-stop skip?
  if (email.skipped) {
    issues.push(email.skipReason || 'Target skipped (hard stop)');
    return { valid: false, issues };
  }

  // Gate 1: Valid email address
  if (!email.to || !email.to.includes('@')) {
    issues.push('Invalid or missing email address');
  }

  // Gate 2: Subject must not contain "Ferdie" or "NorBot"
  if (email.subject) {
    if (email.subject.includes('Ferdie')) {
      issues.push('Subject must not contain "Ferdie"');
    }
    if (email.subject.includes('NorBot')) {
      issues.push('Subject must not contain "NorBot"');
    }
  }

  // Gate 3: No unfilled template variables
  if (email.subject && email.subject.includes('{')) {
    const subjectVars = email.subject.match(/\{[a-zA-Z_]+\}/g);
    if (subjectVars) {
      issues.push(`Subject contains unfilled variables: ${subjectVars.join(', ')}`);
    }
  }

  if (email.textBody) {
    const bodyVars = email.textBody.match(/\{[a-zA-Z_]+\}/g);
    if (bodyVars) {
      issues.push(`Unfilled template variables: ${bodyVars.join(', ')}`);
    }
  }

  // Gate 4: Banned terms (word-boundary regex, case-insensitive)
  if (email.textBody) {
    for (const term of BANNED_TERMS) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(email.textBody)) {
        issues.push(`Banned term found: "${term}"`);
      }
    }
  }

  // Gate 5: CASL footer present
  if (!email.textBody || !email.textBody.includes('STOP')) {
    issues.push('Missing CASL unsubscribe mechanism');
  }

  if (!email.textBody || !email.textBody.includes('NorBot Systems')) {
    issues.push('Missing business name in CASL footer');
  }

  if (!email.textBody || !email.textBody.includes('PO Box 23030')) {
    issues.push('Missing address in CASL footer');
  }

  return { valid: issues.length === 0, issues };
}

// ──────────────────────────────────────────────────────────
// HTML conversion
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
<span style="font-size:13px;color:#6b7280">226-444-3478</span> | <a href="https://www.norbotsystems.com" style="font-size:13px;color:#2563eb;text-decoration:none">norbotsystems.com</a>
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

export { SUBJECT_TEMPLATE, SUBJECT_ROTATION, BODY_TEMPLATE, SIGNATURE, CASL_FOOTER, BANNED_TERMS };
