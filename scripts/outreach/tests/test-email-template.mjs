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
  SUBJECT_ROTATION,
  BODY_TEMPLATE,
  SIGNATURE,
  CASL_FOOTER,
  BANNED_TERMS,
} from '../generate-email.mjs';
import { buildMimeMessage } from '../create-draft.mjs';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  \u2713 ${name}`);
    passed++;
  } catch (e) {
    console.log(`  \u2717 ${name}: ${e.message}`);
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
  demo_url: 'https://testreno.norbotsystems.com',
};

const mockTargetNoPhone = {
  ...mockTarget,
  id: 998,
  phone: null,
  owner_name: null,
  slug: 'noname-reno',
};

const mockTargetNoCity = {
  ...mockTarget,
  id: 997,
  city: '',
  slug: 'nocity-reno',
};

const mockTargetNoCompany = {
  ...mockTarget,
  id: 996,
  company_name: '',
  slug: 'nocompany-reno',
};

const mockTargetMinimal = {
  id: 995,
  company_name: 'Bare Bones Co',
  owner_name: '',
  slug: 'barebones',
  city: 'Kitchener',
  phone: '519-555-9999',
  email: 'info@barebones.ca',
  website: 'https://barebones.ca',
  demo_url: 'https://barebones.norbotsystems.com',
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

test('rejects "Not specified" sentinel', () => {
  assert.equal(getFirstName('Not specified'), 'there');
});

test('rejects "Not applicable" sentinel', () => {
  assert.equal(getFirstName('Not applicable'), 'there');
});

test('rejects "N/A" sentinel', () => {
  assert.equal(getFirstName('N/A'), 'there');
});

// ──────────────────────────────────────────────────────────
// Tests: Call Day Logic
// ──────────────────────────────────────────────────────────

console.log('\nCall Day Logic:');

test('Friday \u2192 "Monday" (skips weekend)', () => {
  const friday = new Date('2026-02-27T10:00:00'); // Feb 27 2026 is Friday
  const label = getCallDayLabel(friday);
  assert.equal(label, 'Monday');
});

test('Monday \u2192 "tomorrow" (next biz day is Tuesday)', () => {
  const monday = new Date('2026-03-02T10:00:00'); // March 2 is Monday
  const label = getCallDayLabel(monday);
  assert.equal(label, 'tomorrow');
});

test('Thursday \u2192 "tomorrow" (next biz day is Friday)', () => {
  const thursday = new Date('2026-02-26T10:00:00');
  const label = getCallDayLabel(thursday);
  assert.equal(label, 'tomorrow');
});

test('Saturday \u2192 "Monday" (skips to Monday)', () => {
  const saturday = new Date('2026-02-28T10:00:00');
  const label = getCallDayLabel(saturday);
  assert.equal(label, 'Monday');
});

// ──────────────────────────────────────────────────────────
// Tests: Next Business Day
// ──────────────────────────────────────────────────────────

console.log('\nNext Business Day:');

test('Friday \u2192 Monday', () => {
  const friday = new Date('2026-02-27T10:00:00');
  const next = getNextBusinessDay(friday);
  assert.equal(next.getDay(), 1); // Monday
});

test('Wednesday \u2192 Thursday', () => {
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
  assert.ok(email.subject.includes('London'), 'Subject should include city');
  assert.ok(email.subject.startsWith('Estimate Request'), 'Subject format');
  assert.ok(email.textBody.includes('Test Renovations'), 'Body includes company name');
  assert.ok(email.textBody.includes('519-555-1234'), 'Body includes phone');
  assert.ok(email.textBody.includes('testreno.norbotsystems.com'), 'Body includes demo URL');
  assert.ok(email.textBody.includes('48 hours'), 'Body mentions 48 hours');
  assert.ok(email.textBody.includes('keep it private'), 'Body mentions privacy');
  assert.ok(email.textBody.includes('STOP'), 'CASL footer present');
  assert.ok(email.textBody.includes('PO Box 23030'), 'Address present');
  assert.equal(email.firstName, 'Mike');
  assert.equal(email.skipped, false);
});

test('HARD STOP: skips target with no phone', () => {
  const email = generateEmail(mockTargetNoPhone, { previewSlot: '2pm' });
  assert.equal(email.skipped, true);
  assert.ok(email.skipReason.includes('phone'), 'Reason mentions phone');
});

test('HARD STOP: skips target with no city', () => {
  const email = generateEmail(mockTargetNoCity, { previewSlot: '2pm' });
  assert.equal(email.skipped, true);
  assert.ok(email.skipReason.includes('city'), 'Reason mentions city');
});

test('HARD STOP: skips target with no company_name', () => {
  const email = generateEmail(mockTargetNoCompany, { previewSlot: '2pm' });
  assert.equal(email.skipped, true);
  assert.ok(email.skipReason.includes('company_name'), 'Reason mentions company_name');
});

test('handles unknown owner name gracefully', () => {
  const email = generateEmail(mockTargetMinimal, { previewSlot: '10:00am' });
  assert.equal(email.firstName, 'there');
  assert.ok(email.textBody.includes('Hi there,'), 'Uses "Hi there,"');
  assert.equal(email.skipped, false);
});

test('subject uses city, not first name', () => {
  const email = generateEmail(mockTarget);
  assert.ok(email.subject.includes('London'), 'Subject includes city');
  assert.ok(!email.subject.includes('Mike'), 'Subject does not include first name');
});

test('demoUrl uses target.demo_url when present', () => {
  const email = generateEmail(mockTarget);
  assert.equal(email.demoUrl, 'https://testreno.norbotsystems.com');
});

test('body includes company_name in opening', () => {
  const email = generateEmail(mockTarget);
  const opening = email.textBody.slice(0, 300);
  assert.ok(opening.includes('Test Renovations'), 'Opening mentions company');
});

test('body includes phone number directly', () => {
  const email = generateEmail(mockTarget);
  assert.ok(email.textBody.includes('at 519-555-1234'), 'Phone in call line');
});

// ──────────────────────────────────────────────────────────
// Tests: Subject Rotation
// ──────────────────────────────────────────────────────────

console.log('\nSubject Rotation:');

test('no rotation when < 3 targets in city', () => {
  const email = generateEmail(mockTarget, { previewSlot: '10am', cityCount: 2, cityIndex: 1 });
  assert.ok(email.subject.startsWith('Estimate Request'), 'Uses primary subject');
});

test('first target in batch always gets primary subject', () => {
  const email = generateEmail(mockTarget, { previewSlot: '10am', cityCount: 5, cityIndex: 0 });
  assert.ok(email.subject.startsWith('Estimate Request'), 'First target uses primary');
});

test('rotates to Option B for 2nd target in 3+ city batch', () => {
  const email = generateEmail(mockTarget, { previewSlot: '10am', cityCount: 3, cityIndex: 1 });
  assert.ok(email.subject.includes('Custom Estimate Portal'), 'Uses rotation B');
  assert.ok(email.subject.includes('Test Renovations'), 'Includes company name');
});

test('rotates to Option C for 3rd target in 3+ city batch', () => {
  const email = generateEmail(mockTarget, { previewSlot: '10am', cityCount: 3, cityIndex: 2 });
  assert.ok(email.subject.includes('Renovation Website Demo'), 'Uses rotation C');
  assert.ok(email.subject.includes('London'), 'Includes city');
});

test('wraps rotation for 4th target', () => {
  const email = generateEmail(mockTarget, { previewSlot: '10am', cityCount: 4, cityIndex: 3 });
  assert.ok(email.subject.includes('Custom Estimate Portal'), 'Wraps back to rotation B');
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
  assert.ok(result.issues.some(i => i.includes('CASL')));
});

test('detects unfilled template variables', () => {
  const email = generateEmail(mockTarget);
  email.textBody = email.textBody + ' {company_name}';
  const result = validateEmail(email);
  assert.ok(!result.valid);
  assert.ok(result.issues.some(i => i.includes('Unfilled')));
});

test('subject with "Ferdie" fails', () => {
  const email = generateEmail(mockTarget);
  email.subject = 'Ferdie - Test Subject';
  const result = validateEmail(email);
  assert.ok(!result.valid);
  assert.ok(result.issues.some(i => i.includes('Ferdie')));
});

test('subject with "NorBot" fails', () => {
  const email = generateEmail(mockTarget);
  email.subject = 'NorBot Systems Offer';
  const result = validateEmail(email);
  assert.ok(!result.valid);
  assert.ok(result.issues.some(i => i.includes('NorBot')));
});

test('detects banned term "AI"', () => {
  const email = generateEmail(mockTarget);
  email.textBody = 'Our AI tool is great.\n\n' + CASL_FOOTER;
  const result = validateEmail(email);
  assert.ok(!result.valid);
  assert.ok(result.issues.some(i => i.includes('AI')));
});

test('detects banned term "ConversionOS"', () => {
  const email = generateEmail(mockTarget);
  email.textBody = 'Built with ConversionOS.\n\n' + CASL_FOOTER;
  const result = validateEmail(email);
  assert.ok(!result.valid);
  assert.ok(result.issues.some(i => i.includes('ConversionOS')));
});

test('detects banned term "platform"', () => {
  const email = generateEmail(mockTarget);
  email.textBody = 'Our platform does it all.\n\n' + CASL_FOOTER;
  const result = validateEmail(email);
  assert.ok(!result.valid);
  assert.ok(result.issues.some(i => i.includes('platform')));
});

test('detects banned term "free"', () => {
  const email = generateEmail(mockTarget);
  email.textBody = 'It is totally free for you.\n\n' + CASL_FOOTER;
  const result = validateEmail(email);
  assert.ok(!result.valid);
  assert.ok(result.issues.some(i => i.includes('free')));
});

test('hard-stop email fails validation', () => {
  const email = generateEmail(mockTargetNoPhone);
  const result = validateEmail(email);
  assert.ok(!result.valid);
  assert.ok(result.issues.some(i => i.includes('HARD STOP')));
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

test('includes signature with website link', () => {
  const html = textToHtml('Hello', SIGNATURE, CASL_FOOTER);
  assert.ok(html.includes('Ferdie Botden, CPA'));
  assert.ok(html.includes('norbotsystems.com'));
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

test('signature has phone and website on same line', () => {
  const html = textToHtml('Hello', SIGNATURE, CASL_FOOTER);
  // Phone and website should be in the same <td> with a pipe separator
  assert.ok(html.includes('226-444-3478</span> | <a'));
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
// Tests: Constants
// ──────────────────────────────────────────────────────────

console.log('\nConstants:');

test('BANNED_TERMS has 8 terms', () => {
  assert.equal(BANNED_TERMS.length, 8);
});

test('SUBJECT_ROTATION has 2 alternatives', () => {
  assert.equal(SUBJECT_ROTATION.length, 2);
});

test('SUBJECT_TEMPLATE uses em dash', () => {
  assert.ok(SUBJECT_TEMPLATE.includes('\u2014'), 'Subject uses em dash');
});

test('BODY_TEMPLATE starts with "Hi"', () => {
  assert.ok(BODY_TEMPLATE.startsWith('Hi '), 'Body starts with Hi');
});

// ──────────────────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(40)}`);
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('All tests passed!\n');
