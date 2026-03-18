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
// Ferdie's email template — March 18, 2026 (v3)
// Reputation-first opener, 48h urgency, reply/text CTA
// ──────────────────────────────────────────────────────────

const SUBJECT_TEMPLATE = 'Estimate Request - {city}';

// Rotation alternatives for 3+ targets in same city in one batch
const SUBJECT_ROTATION = [
  '{company_name} - Custom Estimate Portal',
  '{city} Renovation Website Demo',
];

// Cities >200km from Stratford — omit "out of Stratford" in greeting
const FAR_CITIES = new Set([
  'kingston', 'sudbury', 'windsor', 'peterborough', 'oshawa',
  'ottawa', 'thunder bay', 'sault ste marie', 'north bay', 'barrie',
  'orillia', 'belleville', 'cornwall', 'timmins', 'kenora',
  'st catharines', 'niagara falls', 'welland',
]);

/**
 * @deprecated v3 template hardcodes "out of Stratford". Kept for backward compat.
 * Returns " out of Stratford" for nearby cities, "" for distant ones.
 */
export function getLocationClause(city) {
  if (!city) return '';
  return FAR_CITIES.has(city.toLowerCase()) ? '' : ' out of Stratford';
}

const BODY_TEMPLATE = `Hi {firstName},

I'm Ferdie out of Stratford. I've been looking at renovation contractors in {city} with a strong reputation, and {company_name} stood out.

I rebuilt your website from the ground up \u2014 same brand, same projects, same reviews \u2014 but brought up to a premium standard with a brain behind it.

Homeowners can take or upload a photo of their space and see what the renovation would look like. Visitors don't slip through the cracks. Leads, quotes, and invoices \u2014 all managed in one place.

There's a demo I've built for you live right now \u2014 it'll be up for 48 hours. Poke around and try it yourself \u2014 upload a photo and see what happens:
{demoUrl}

After you've had a look, just reply to this email or shoot me a text. I can have a fully custom version built for {company_name} within a couple of days.

Cheers,
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
  'not specified', 'not applicable', 'not provided', 'not found',
  'n/a', 'na', 'unknown', 'none', 'owner',
]);

export function getFirstName(ownerName) {
  if (!ownerName || ownerName.trim().length === 0) return 'there';
  const trimmed = ownerName.trim();
  if (SENTINEL_NAMES.has(trimmed.toLowerCase())) return 'there';
  const first = trimmed.split(/\s+/)[0];
  // Strip trailing punctuation (commas, periods, semicolons) from first name
  // Handles multi-person names like "Domenic, Nick, and Jo" → "Domenic"
  const cleaned = first.replace(/[,;.]+$/, '');
  // Reject single-char names or names that look like placeholders
  if (cleaned.length <= 1) return 'there';
  return cleaned;
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

  // HARD STOP: email is mandatory
  if (!target.email || !target.email.includes('@')) {
    return {
      to: target.email,
      subject: '', textBody: '', htmlBody: '',
      callDay: '', callTime: '', firstName: '', demoUrl: '', siteId: '',
      skipped: true,
      skipReason: 'HARD STOP: missing or invalid email',
    };
  }

  const firstName = getFirstName(target.owner_name);
  const city = target.city.trim();
  const companyName = target.company_name.trim();
  const siteId = options.siteId || target.slug;
  const demoUrl = target.demo_url || `https://${siteId}.norbotsystems.com`;
  const callDay = getCallDayLabel();
  const callTime = options.previewSlot || '10:30am';
  const callPhone = (target.phone || '').trim();

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
    .replace('{city}', city)
    .replace(/\{company_name\}/g, companyName)
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

// ──────────────────────────────────────────────────────────
// Follow-up email templates (5-touch sequence)
// ──────────────────────────────────────────────────────────
// Subject: "Re: Estimate Request — {city}" to thread in same conversation.
// Send timing: Mon-Thu 7:00 AM ET (contractors check phone before job site).
// Each follow-up is a Gmail draft — Ferdie reviews before sending.
//
// Sequence: Email 1 (Day 1) → Email 2 (Day 3) → Email 3 (Day 6)
//           → Email 4 (Day 12) → Email 5 (Day 20)

const FOLLOWUP_TEMPLATES = {
  // Email 2: Casual check-in (Day 3)
  2: {
    subjectPrefix: 'Re: ',
    body: `Hi {firstName},

Just checking in \u2014 did you get a chance to look at the site I built for {company_name}?

Here's the link again in case it got buried: {demoUrl}

No pressure at all \u2014 take a look when you have a minute.

Ferdie`,
  },

  // Email 3: Value drop with specific comparison (Day 6)
  3: {
    subjectPrefix: 'Re: ',
    body: `Hi {firstName},

Quick thought \u2014 I was looking at your current site vs the one I built, and the difference is pretty clear. Your visitors are getting a basic brochure while your competitors are capturing leads and generating estimates 24/7.

The rebuild has everything under your brand \u2014 your colours, your projects, your reviews \u2014 just with the tools to actually convert visitors into paying clients: {demoUrl}

Worth a 5-minute look?

Ferdie`,
  },

  // Email 4: Social proof + soft CTA (Day 12)
  4: {
    subjectPrefix: 'Re: ',
    body: `Hi {firstName},

I've been building these for renovation contractors across {region} and the feedback has been really positive \u2014 especially on the estimate tool and the AI visualiser that lets homeowners see what their reno could look like.

I built yours specifically for {company_name}: {demoUrl}

If you're curious, I'm happy to walk you through it in a quick call. No sales pitch \u2014 just showing you what's there.

Ferdie`,
  },

  // Email 5: Break-up / final note (Day 20)
  5: {
    subjectPrefix: '',
    body: `Hi {firstName},

I've reached out a few times about the website I built for {company_name} \u2014 totally understand if it's not the right time or not a fit.

I'll be moving on to other contractors in {city}, but the demo is still live if you want to take a look before I take it down: {demoUrl}

Either way, no hard feelings. If you ever need a hand with your online presence, you know where to find me.

All the best,
Ferdie`,
  },
};

// Follow-up timing: days after email 1 was sent
export const FOLLOWUP_SCHEDULE = {
  2: 3,   // Email 2: 3 days after email 1
  3: 6,   // Email 3: 6 days after email 1
  4: 12,  // Email 4: 12 days after email 1
  5: 20,  // Email 5: 20 days after email 1
};

/**
 * Generate a follow-up email for a target.
 *
 * @param {object} target — Turso target row
 * @param {number} emailNum — 2-5 (which follow-up)
 * @param {object} [options]
 * @param {string} [options.region] — region name for social proof (defaults to target.city)
 * @returns {{ to, subject, textBody, htmlBody, emailNum, skipped, skipReason }}
 */
export function generateFollowUpEmail(target, emailNum, options = {}) {
  if (emailNum < 2 || emailNum > 5) {
    return { to: target.email, subject: '', textBody: '', htmlBody: '', emailNum, skipped: true, skipReason: `Invalid emailNum: ${emailNum}` };
  }

  if (!target.email || !target.email.includes('@')) {
    return { to: target.email, subject: '', textBody: '', htmlBody: '', emailNum, skipped: true, skipReason: 'HARD STOP: missing email' };
  }

  if (!target.company_name || target.company_name.trim().length === 0) {
    return { to: target.email, subject: '', textBody: '', htmlBody: '', emailNum, skipped: true, skipReason: 'HARD STOP: missing company_name' };
  }

  const template = FOLLOWUP_TEMPLATES[emailNum];
  const firstName = getFirstName(target.owner_name);
  const city = (target.city || '').trim();
  const companyName = target.company_name.trim();
  const siteId = target.slug;
  const demoUrl = target.demo_url || `https://${siteId}.norbotsystems.com`;
  const region = options.region || target.territory || city || 'Ontario';

  // Subject: "Re: Estimate Request — {city}" for threading (emails 2-4)
  // Email 5 uses a different subject to stand out
  const baseSubject = city ? `Estimate Request - ${city}` : `Estimate Request - ${companyName}`;
  const subject = emailNum === 5
    ? `${firstName === 'there' ? companyName : firstName} - last note`
    : `Re: ${baseSubject}`;

  const textBody = template.body
    .replace(/\{firstName\}/g, firstName)
    .replace(/\{company_name\}/g, companyName)
    .replace(/\{city\}/g, city)
    .replace(/\{demoUrl\}/g, demoUrl)
    .replace(/\{region\}/g, region);

  const fullTextBody = `${textBody}\n\n${SIGNATURE}\n\n${CASL_FOOTER}`;
  const htmlBody = textToHtml(textBody, SIGNATURE, CASL_FOOTER);

  return {
    to: target.email,
    subject,
    textBody: fullTextBody,
    htmlBody,
    emailNum,
    demoUrl,
    siteId,
    skipped: false,
  };
}

export { SUBJECT_TEMPLATE, SUBJECT_ROTATION, BODY_TEMPLATE, SIGNATURE, CASL_FOOTER, BANNED_TERMS, FOLLOWUP_TEMPLATES, FAR_CITIES };
