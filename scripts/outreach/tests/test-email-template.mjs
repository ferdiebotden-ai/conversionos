#!/usr/bin/env node
/**
 * Mock data tests for the outreach pipeline.
 * No real APIs — tests template filling, quality gates, HTML, MIME, calendar slots.
 *
 * Usage:
 *   node scripts/outreach/tests/test-email-template.mjs
 */

import { strict as assert } from 'node:assert';
import {
  generateEmail,
  validateEmail,
  getFirstName,
  getCallDayLabel,
  getNextBusinessDay,
  textToHtml,
  CALL_SLOTS,
  SUBJECT_TEMPLATE,
  BODY_TEMPLATE,
  SIGNATURE,
  CASL_FOOTER,
} from '../generate-email.mjs';
import { buildMimeMessage } from '../create-draft.mjs';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`);
    failed++;
  }
}

// ──────────────────────────────────────────────────────────
// Mock target data
// ──────────────────────────────────────────────────────────

const mockTarget = {
  id: 999,
  company_name: 'Test Renovations',
  owner_name: 'Mike Smith',
  slug: 'testreno',
  city: 'London',
  phone: '519-555-1234',
  email: 'mike@testreno.ca',
  website: 'https://testreno.ca',
  icp_score: 85,
  google_rating: 4.7,
  google_review_count: 42,
  years_in_business: 8,
  services: 'Kitchen, Bathroom, Basement renovations',
};

const mockTargetNoPhone = {
  ...mockTarget,
  id: 998,
  phone: null,
  owner_name: null,
  slug: 'noname-reno',
};

const mockTargetMinimal = {
  id: 997,
  company_name: 'Bare Bones Co',
  owner_name: '',
  slug: 'barebones',
  city: '',
  phone: '',
  email: 'info@barebones.ca',
  website: 'https://barebones.ca',
};

// ──────────────────────────────────────────────────────────
// Tests: First Name Extraction
// ──────────────────────────────────────────────────────────

console.log('\nFirst Name Extraction:');

test('extracts first name from full name', () => {
  assert.equal(getFirstName('Mike Smith'), 'Mike');
});

test('handles single name', () => {
  assert.equal(getFirstName('Mike'), 'Mike');
});

test('defaults to "there" for null', () => {
  assert.equal(getFirstName(null), 'there');
});

test('defaults to "there" for empty string', () => {
  assert.equal(getFirstName(''), 'there');
});

test('trims whitespace', () => {
  assert.equal(getFirstName('  Mike  Smith '), 'Mike');
});

// ──────────────────────────────────────────────────────────
// Tests: Call Day Logic
// ──────────────────────────────────────────────────────────

console.log('\nCall Day Logic:');

test('Friday → "Monday" (skips weekend)', () => {
  const friday = new Date('2026-02-27T10:00:00'); // Feb 27 2026 is Friday
  const label = getCallDayLabel(friday);
  assert.equal(label, 'Monday');
});

test('Monday → "tomorrow" (next biz day is Tuesday)', () => {
  const monday = new Date('2026-03-02T10:00:00'); // March 2 is Monday
  const label = getCallDayLabel(monday);
  assert.equal(label, 'tomorrow');
});

test('Thursday → "tomorrow" (next biz day is Friday)', () => {
  const thursday = new Date('2026-02-26T10:00:00');
  const label = getCallDayLabel(thursday);
  assert.equal(label, 'tomorrow');
});

test('Saturday → "Monday" (skips to Monday)', () => {
  const saturday = new Date('2026-02-28T10:00:00');
  const label = getCallDayLabel(saturday);
  assert.equal(label, 'Monday');
});

// ──────────────────────────────────────────────────────────
// Tests: Next Business Day
// ──────────────────────────────────────────────────────────

console.log('\nNext Business Day:');

test('Friday → Monday', () => {
  const friday = new Date('2026-02-27T10:00:00');
  const next = getNextBusinessDay(friday);
  assert.equal(next.getDay(), 1); // Monday
});

test('Wednesday → Thursday', () => {
  const wed = new Date('2026-02-25T10:00:00');
  const next = getNextBusinessDay(wed);
  assert.equal(next.getDay(), 4); // Thursday
});

// ──────────────────────────────────────────────────────────
// Tests: Email Generation
// ──────────────────────────────────────────────────────────

console.log('\nEmail Generation:');

test('generates complete email for full target', () => {
  const email = generateEmail(mockTarget, { previewSlot: '10:30am' });
  assert.equal(email.to, 'mike@testreno.ca');
  assert.ok(email.subject.includes('Mike'));
  assert.ok(email.textBody.includes('Ferdie out of Stratford'));
  assert.ok(email.textBody.includes('London'));
  assert.ok(email.textBody.includes('testreno.norbotsystems.com'));
  assert.ok(email.textBody.includes('519-555-1234'));
  assert.ok(email.textBody.includes('48 hours'));
  assert.ok(email.textBody.includes('keep it private'));
  assert.ok(email.textBody.includes('STOP'));
  assert.ok(email.textBody.includes('PO Box 23030'));
  assert.equal(email.firstName, 'Mike');
});

test('handles missing phone gracefully', () => {
  const email = generateEmail(mockTargetNoPhone, { previewSlot: '2pm' });
  assert.equal(email.firstName, 'there');
  assert.ok(!email.textBody.includes('null'));
  // Should not include phone clause
  assert.ok(!email.textBody.includes(' at null'));
});

test('handles minimal target', () => {
  const email = generateEmail(mockTargetMinimal, { previewSlot: '10:00am' });
  assert.equal(email.firstName, 'there');
  assert.ok(email.textBody.includes('your area')); // city fallback
  assert.ok(email.textBody.includes('STOP'));
});

test('subject matches template format', () => {
  const email = generateEmail(mockTarget);
  assert.ok(email.subject.startsWith('Mike - Estimate Request Intake'));
});

test('demoUrl uses slug', () => {
  const email = generateEmail(mockTarget);
  assert.equal(email.demoUrl, 'https://testreno.norbotsystems.com');
});

// ──────────────────────────────────────────────────────────
// Tests: Quality Gates
// ──────────────────────────────────────────────────────────

console.log('\nQuality Gates:');

test('valid email passes all gates', () => {
  const email = generateEmail(mockTarget, { previewSlot: '10:30am' });
  const result = validateEmail(email);
  assert.ok(result.valid, `Failed: ${result.issues.join(', ')}`);
});

test('invalid email address fails', () => {
  const email = generateEmail(mockTarget);
  email.to = 'not-an-email';
  const result = validateEmail(email);
  assert.ok(!result.valid);
  assert.ok(result.issues.some(i => i.includes('email address')));
});

test('missing CASL footer fails', () => {
  const email = generateEmail(mockTarget);
  email.textBody = email.textBody.replace('STOP', '');
  const result = validateEmail(email);
  assert.ok(!result.valid);
});

// ──────────────────────────────────────────────────────────
// Tests: HTML Conversion
// ──────────────────────────────────────────────────────────

console.log('\nHTML Conversion:');

test('converts URLs to clickable links', () => {
  const html = textToHtml('Visit https://example.com today', SIGNATURE, CASL_FOOTER);
  assert.ok(html.includes('<a href="https://example.com"'));
  assert.ok(html.includes('text-decoration:underline'));
});

test('converts www.norbotsystems.com to link', () => {
  const html = textToHtml('Visit www.norbotsystems.com for more', SIGNATURE, CASL_FOOTER);
  assert.ok(html.includes('<a href="https://www.norbotsystems.com"'));
});

test('includes signature block', () => {
  const html = textToHtml('Hello', SIGNATURE, CASL_FOOTER);
  assert.ok(html.includes('Ferdie Botden, CPA'));
  assert.ok(html.includes('226-444-3478'));
});

test('includes CASL footer', () => {
  const html = textToHtml('Hello', SIGNATURE, CASL_FOOTER);
  assert.ok(html.includes('PO Box 23030'));
  assert.ok(html.includes('STOP'));
});

test('escapes HTML entities', () => {
  const html = textToHtml('Price: <$500 & more', SIGNATURE, CASL_FOOTER);
  assert.ok(html.includes('&lt;$500'));
  assert.ok(html.includes('&amp; more'));
});

test('includes dark mode meta tags', () => {
  const html = textToHtml('Hello', SIGNATURE, CASL_FOOTER);
  assert.ok(html.includes('color-scheme'));
  assert.ok(html.includes('light dark'));
});

// ──────────────────────────────────────────────────────────
// Tests: MIME Message
// ──────────────────────────────────────────────────────────

console.log('\nMIME Message:');

test('builds valid MIME with Message-ID', () => {
  const email = generateEmail(mockTarget);
  const { mimeString, messageId } = buildMimeMessage(email);
  assert.ok(messageId.startsWith('<'));
  assert.ok(messageId.endsWith('@outreach.norbotsystems.com>'));
  assert.ok(mimeString.includes('multipart/alternative'));
  assert.ok(mimeString.includes('From: Ferdie Botden'));
  assert.ok(mimeString.includes('mike@testreno.ca'));
});

test('MIME includes both text and HTML parts', () => {
  const email = generateEmail(mockTarget);
  const { mimeString } = buildMimeMessage(email);
  assert.ok(mimeString.includes('text/plain'));
  assert.ok(mimeString.includes('text/html'));
});

test('MIME has unique Message-IDs', () => {
  const email = generateEmail(mockTarget);
  const { messageId: id1 } = buildMimeMessage(email);
  const { messageId: id2 } = buildMimeMessage(email);
  assert.notEqual(id1, id2);
});

// ──────────────────────────────────────────────────────────
// Tests: Call Slots
// ──────────────────────────────────────────────────────────

console.log('\nCall Slots:');

test('10 available slots (skip noon)', () => {
  assert.equal(CALL_SLOTS.length, 10);
});

test('no noon slot', () => {
  assert.ok(!CALL_SLOTS.some(s => s.startsWith('12')));
});

test('first slot is 9:30am', () => {
  assert.equal(CALL_SLOTS[0], '9:30am');
});

test('last slot is 3:00pm', () => {
  assert.equal(CALL_SLOTS[CALL_SLOTS.length - 1], '3:00pm');
});

// ──────────────────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(40)}`);
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('All tests passed!\n');
