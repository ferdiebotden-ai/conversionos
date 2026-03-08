/**
 * Unit tests for provisioner quality gates and helper functions.
 * Tests: inferServiceIcon, inferBadgeIcon, isStrongHero, quality gate filtering.
 *
 * Imports shared logic from scripts/onboarding/lib/quality-gates.mjs.
 */

import { describe, it, expect } from 'vitest';
import {
  inferServiceIcon,
  inferBadgeIcon,
  isStrongHero,
  filterTestimonials,
  filterPortfolio,
  filterServices,
  normalizeTestimonial,
  normalizeAboutCopy,
  diversifyPortfolioTitles,
  detectForeignBrandNames,
} from '../../../scripts/onboarding/lib/quality-gates.mjs';

// ─── Tests ───

describe('inferServiceIcon', () => {
  it('maps kitchen to chef-hat', () => {
    expect(inferServiceIcon('Kitchen Renovation')).toBe('chef-hat');
    expect(inferServiceIcon('Custom Kitchen Design')).toBe('chef-hat');
  });

  it('maps bathroom/bath to bath', () => {
    expect(inferServiceIcon('Bathroom Renovation')).toBe('bath');
    expect(inferServiceIcon('Master Bath Remodel')).toBe('bath');
  });

  it('maps basement to home', () => {
    expect(inferServiceIcon('Basement Finishing')).toBe('home');
  });

  it('maps flooring variants to layers', () => {
    expect(inferServiceIcon('Flooring Installation')).toBe('layers');
    expect(inferServiceIcon('Hardwood Floor Refinishing')).toBe('layers');
  });

  it('maps outdoor/deck/patio to trees', () => {
    expect(inferServiceIcon('Outdoor Living Spaces')).toBe('trees');
    expect(inferServiceIcon('Deck Building')).toBe('trees');
    expect(inferServiceIcon('Patio Construction')).toBe('trees');
  });

  it('maps painting to paintbrush', () => {
    expect(inferServiceIcon('Interior Painting')).toBe('paintbrush');
    expect(inferServiceIcon('Paint & Drywall')).toBe('paintbrush');
  });

  it('maps trades to correct icons', () => {
    expect(inferServiceIcon('Plumbing Services')).toBe('droplets');
    expect(inferServiceIcon('Electrical Work')).toBe('zap');
    expect(inferServiceIcon('Roofing Repair')).toBe('warehouse');
    expect(inferServiceIcon('Roof Replacement')).toBe('warehouse');
  });

  it('maps windows/doors to door-open', () => {
    expect(inferServiceIcon('Window Replacement')).toBe('door-open');
    expect(inferServiceIcon('Door Installation')).toBe('door-open');
  });

  it('maps additions to building', () => {
    expect(inferServiceIcon('Home Addition')).toBe('building');
    expect(inferServiceIcon('Room Extension')).toBe('building');
  });

  it('maps renovation/remodel to hammer', () => {
    expect(inferServiceIcon('Custom Renovation')).toBe('hammer');
    expect(inferServiceIcon('Whole Home Remodel')).toBe('hammer');
  });

  it('defaults to wrench for unknown services', () => {
    expect(inferServiceIcon('General Contracting')).toBe('wrench');
    expect(inferServiceIcon('HVAC Repair')).toBe('wrench');
    expect(inferServiceIcon('Landscaping')).toBe('wrench');
  });

  it('is case-insensitive', () => {
    expect(inferServiceIcon('KITCHEN RENOVATION')).toBe('chef-hat');
    expect(inferServiceIcon('bathroom')).toBe('bath');
    expect(inferServiceIcon('Basement')).toBe('home');
  });

  it('matches partial keywords in longer names', () => {
    expect(inferServiceIcon('Full Kitchen and Dining Renovation')).toBe('chef-hat');
    expect(inferServiceIcon('Professional Roofing Solutions')).toBe('warehouse');
  });
});

describe('inferBadgeIcon', () => {
  it('maps licensing/insurance to shield-check', () => {
    expect(inferBadgeIcon('Licensed & Insured')).toBe('shield-check');
    expect(inferBadgeIcon('Fully Bonded')).toBe('shield-check');
    expect(inferBadgeIcon('Licensed Contractor')).toBe('shield-check');
  });

  it('maps BBB/accreditation to badge-check', () => {
    expect(inferBadgeIcon('BBB A+ Rating')).toBe('badge-check');
    expect(inferBadgeIcon('Accredited Business')).toBe('badge-check');
  });

  it('maps WSIB/safety to hard-hat', () => {
    expect(inferBadgeIcon('WSIB Covered')).toBe('hard-hat');
    expect(inferBadgeIcon('Safety Certified')).toBe('hard-hat');
  });

  it('maps location-based to map-pin', () => {
    expect(inferBadgeIcon('Ontario-Based')).toBe('map-pin');
    expect(inferBadgeIcon('Locally Owned')).toBe('map-pin');
    expect(inferBadgeIcon('London Based')).toBe('map-pin');
  });

  it('maps guarantees to shield', () => {
    expect(inferBadgeIcon('Satisfaction Guarantee')).toBe('shield');
    expect(inferBadgeIcon('5-Year Warranty')).toBe('shield');
  });

  it('maps certifications to award', () => {
    expect(inferBadgeIcon('RenoMark Member')).toBe('award');
    expect(inferBadgeIcon('Certified Installer')).toBe('award');
  });

  it('maps membership/association to users', () => {
    expect(inferBadgeIcon('CHBA Member')).toBe('users');
    expect(inferBadgeIcon('Association of Builders')).toBe('users');
  });

  it('maps eco/green to leaf', () => {
    expect(inferBadgeIcon('Eco-Friendly')).toBe('leaf');
    expect(inferBadgeIcon('Green Building Certified')).toBe('leaf');
    expect(inferBadgeIcon('Energy Star Partner')).toBe('leaf');
  });

  it('maps experience/years to calendar', () => {
    expect(inferBadgeIcon('20 Years Experience')).toBe('calendar');
    expect(inferBadgeIcon('15+ Years in Business')).toBe('calendar');
  });

  it('defaults to award for unknown badges', () => {
    expect(inferBadgeIcon('Premium Quality')).toBe('award');
    expect(inferBadgeIcon('Top Rated')).toBe('award');
  });
});

describe('isStrongHero', () => {
  it('accepts compelling headlines', () => {
    expect(isStrongHero('Bringing Your Dream Kitchen to Life')).toBe(true);
    expect(isStrongHero('Transform Your Home with Expert Craftsmanship')).toBe(true);
    expect(isStrongHero('Quality Renovation Services in London, Ontario')).toBe(true);
  });

  it('rejects null/undefined/empty headlines', () => {
    expect(isStrongHero(null)).toBe(false);
    expect(isStrongHero(undefined)).toBe(false);
    expect(isStrongHero('')).toBe(false);
  });

  it('rejects headlines shorter than 10 chars', () => {
    expect(isStrongHero('Hello')).toBe(false);
    expect(isStrongHero('Renovate')).toBe(false);
    expect(isStrongHero('123456789')).toBe(false); // exactly 9 chars
  });

  it('rejects headlines longer than 100 chars', () => {
    const long = 'A'.repeat(101);
    expect(isStrongHero(long)).toBe(false);
  });

  it('accepts headlines at boundary lengths', () => {
    expect(isStrongHero('A'.repeat(10))).toBe(true); // exactly 10 chars
    expect(isStrongHero('B'.repeat(100))).toBe(true); // exactly 100 chars
  });

  it('rejects generic headlines', () => {
    expect(isStrongHero('Welcome to Our Website')).toBe(false);
    expect(isStrongHero('Home Page Content Here')).toBe(false);
    expect(isStrongHero('About Us Information')).toBe(false);
    expect(isStrongHero('Our Company Overview')).toBe(false);
    expect(isStrongHero('Main Page Headline')).toBe(false);
  });

  it('rejects exact generic matches (case-insensitive)', () => {
    expect(isStrongHero('Welcome')).toBe(false); // too short anyway
    expect(isStrongHero('Home Page Here')).toBe(false);
    expect(isStrongHero('ABOUT US HERE.')).toBe(false);
  });

  it('rejects headline that is just the business name', () => {
    expect(isStrongHero('Test Reno Inc.', 'Test Reno Inc.')).toBe(false);
    expect(isStrongHero('test reno inc.', 'Test Reno Inc.')).toBe(false);
  });

  it('accepts headline containing but not equal to business name', () => {
    expect(isStrongHero('Test Reno Inc. — Your Trusted Contractor', 'Test Reno Inc.')).toBe(true);
  });

  it('handles whitespace in headlines', () => {
    expect(isStrongHero('  Welcome  ')).toBe(false); // trimmed = "Welcome" which is too short + generic
    expect(isStrongHero('  Quality Renovations  ')).toBe(true);
  });
});

describe('filterTestimonials (Gate 2)', () => {
  it('keeps valid testimonials with sufficient content', () => {
    const input = [
      { author: 'Sarah M., London', quote: 'Excellent work on our kitchen renovation. Very professional team.' },
      { author: 'James R., Kitchener', quote: 'Transformed our basement into a beautiful living space.' },
      { author: 'Priya K., Hamilton', quote: 'Outstanding quality. Highly recommend for any renovation project.' },
    ];
    const result = filterTestimonials(input);
    expect(result).toHaveLength(3);
  });

  it('returns empty array when fewer than 2 valid testimonials', () => {
    const input = [
      { author: 'J', quote: 'Short.' }, // author too short, quote too short
      { author: 'Sarah M.', quote: 'This was a great experience and very professional.' },
    ];
    const result = filterTestimonials(input);
    expect(result).toHaveLength(0);
  });

  it('returns empty array for completely empty input', () => {
    expect(filterTestimonials([])).toHaveLength(0);
  });

  it('filters out testimonials with missing author', () => {
    const input = [
      { author: '', quote: 'Great work on our renovation project, very happy.' },
      { author: 'Sarah M.', quote: 'Excellent craftsmanship and attention to detail always.' },
      { author: 'James R.', quote: 'Would highly recommend for kitchen renovations.' },
    ];
    const result = filterTestimonials(input);
    expect(result).toHaveLength(2);
    expect(result.every(t => t.author.length > 2)).toBe(true);
  });

  it('filters out testimonials with quote shorter than 20 chars', () => {
    const input = [
      { author: 'Sarah M.', quote: 'Great work!' }, // 11 chars
      { author: 'James R.', quote: 'Excellent craftsmanship and very professional work.' },
      { author: 'Priya K.', quote: 'Outstanding renovation quality and service.' },
    ];
    const result = filterTestimonials(input);
    expect(result).toHaveLength(2);
  });

  it('returns exactly 2 when only 2 valid testimonials exist', () => {
    const input = [
      { author: 'Sarah M.', quote: 'Excellent craftsmanship and very professional work always.' },
      { author: 'Bad', quote: 'No.' },
      { author: 'James R.', quote: 'Outstanding renovation quality and great service.' },
    ];
    const result = filterTestimonials(input);
    expect(result).toHaveLength(2);
  });

  it('handles null/undefined author or quote', () => {
    const input = [
      { author: null, quote: 'Some text that is long enough for this test.' },
      { author: 'Sarah M.', quote: null },
      { author: 'James R.', quote: 'Outstanding renovation quality and service here.' },
      { author: 'Priya K.', quote: 'Excellent quality and great team to work with.' },
    ];
    const result = filterTestimonials(input);
    expect(result).toHaveLength(2);
  });
});

describe('filterPortfolio (Gate 3)', () => {
  it('keeps items with valid HTTP image URLs', () => {
    const input = [
      { title: 'Kitchen Reno', image_url: 'https://example.com/kitchen.jpg' },
      { title: 'Bathroom', image_url: 'https://example.com/bath.jpg' },
    ];
    expect(filterPortfolio(input)).toHaveLength(2);
  });

  it('keeps items with relative image paths', () => {
    const input = [
      { title: 'Kitchen', image_url: '/uploads/kitchen.jpg' },
    ];
    expect(filterPortfolio(input)).toHaveLength(1);
  });

  it('filters out items with no image_url', () => {
    const input = [
      { title: 'Kitchen', image_url: '' },
      { title: 'Bath', image_url: null },
      { title: 'Basement' }, // missing entirely
    ];
    expect(filterPortfolio(input)).toHaveLength(0);
  });

  it('filters out items with no title', () => {
    const input = [
      { title: '', image_url: 'https://example.com/img.jpg' },
      { title: null, image_url: 'https://example.com/img2.jpg' },
    ];
    expect(filterPortfolio(input)).toHaveLength(0);
  });

  it('filters out items with non-URL image strings', () => {
    const input = [
      { title: 'Kitchen', image_url: 'data:image/png;base64,...' },
      { title: 'Bath', image_url: 'blob:https://...' },
    ];
    expect(filterPortfolio(input)).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(filterPortfolio([])).toHaveLength(0);
  });
});

describe('filterServices (Gate 4)', () => {
  it('keeps well-formed services', () => {
    const input = [
      { name: 'Kitchen Renovation', description: 'Full kitchen remodel with custom cabinets.' },
      { name: 'Bathroom Remodel', description: 'Complete bathroom transformation services.' },
    ];
    expect(filterServices(input)).toHaveLength(2);
  });

  it('filters out services with name shorter than 3 chars', () => {
    const input = [
      { name: 'Hi', description: 'Some valid description text here.' },
      { name: 'Kitchen Renovation', description: 'Full kitchen remodel with custom work.' },
    ];
    expect(filterServices(input)).toHaveLength(1);
  });

  it('filters out services with description shorter than 10 chars', () => {
    const input = [
      { name: 'Kitchen Renovation', description: 'Short.' },
      { name: 'Bathroom Remodel', description: 'Complete bathroom transformation services.' },
    ];
    expect(filterServices(input)).toHaveLength(1);
  });

  it('filters out placeholder service names', () => {
    const placeholders = ['Service 1', 'Service 2', 'TBD', 'Placeholder', 'Coming Soon'];
    for (const name of placeholders) {
      const result = filterServices([{ name, description: 'Some valid description text here.' }]);
      expect(result).toHaveLength(0);
    }
  });

  it('placeholder check is case-insensitive', () => {
    const input = [
      { name: 'service 1', description: 'Some valid description text here.' },
      { name: 'COMING SOON', description: 'Some valid description text here.' },
    ];
    expect(filterServices(input)).toHaveLength(0);
  });

  it('handles null/undefined name or description', () => {
    const input = [
      { name: null, description: 'Some valid description text.' },
      { name: 'Kitchen', description: null },
      { name: undefined, description: undefined },
    ];
    expect(filterServices(input)).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(filterServices([])).toHaveLength(0);
  });

  it('keeps services with exactly threshold lengths', () => {
    const input = [
      { name: 'ABC', description: '1234567890' }, // name=3, desc=10 — both at threshold
    ];
    expect(filterServices(input)).toHaveLength(1);
  });
});

// ─── N/A Sanitization (WS2) ───
// Tests the sanitizeNA logic as used in provision.mjs (local function, tested inline)
describe('sanitizeNA logic', () => {
  // Mirrors the function in provision.mjs
  function sanitizeNA(val) {
    if (!val || typeof val !== 'string') return '';
    const lower = val.trim().toLowerCase();
    if (['n/a', 'na', 'not available', 'not specified', 'not applicable', 'unknown', 'none'].includes(lower)) return '';
    return val.trim();
  }

  it('returns empty string for N/A variants', () => {
    expect(sanitizeNA('N/A')).toBe('');
    expect(sanitizeNA('n/a')).toBe('');
    expect(sanitizeNA('NA')).toBe('');
    expect(sanitizeNA('Not Available')).toBe('');
    expect(sanitizeNA('not specified')).toBe('');
    expect(sanitizeNA('Not Applicable')).toBe('');
    expect(sanitizeNA('Unknown')).toBe('');
    expect(sanitizeNA('none')).toBe('');
  });

  it('preserves valid values', () => {
    expect(sanitizeNA('Mon-Fri 9am-5pm')).toBe('Mon-Fri 9am-5pm');
    expect(sanitizeNA('123 Main St')).toBe('123 Main St');
    expect(sanitizeNA('N5A 3H1')).toBe('N5A 3H1');
  });

  it('trims whitespace', () => {
    expect(sanitizeNA('  Hello  ')).toBe('Hello');
    expect(sanitizeNA('  N/A  ')).toBe('');
  });

  it('handles null, undefined, empty', () => {
    expect(sanitizeNA(null)).toBe('');
    expect(sanitizeNA(undefined)).toBe('');
    expect(sanitizeNA('')).toBe('');
  });

  it('handles non-string values', () => {
    expect(sanitizeNA(42)).toBe('');
    expect(sanitizeNA(true)).toBe('');
  });
});

// ─── normalizeTestimonial (Issue #2 — Mar 8, 2026) ─────────────────────────

describe('normalizeTestimonial', () => {
  it('passes through canonical field names (author/quote)', () => {
    const result = normalizeTestimonial({ author: 'Sarah M.', quote: 'Great work on our renovation.' });
    expect(result.author).toBe('Sarah M.');
    expect(result.quote).toBe('Great work on our renovation.');
  });

  it('normalizes name→author', () => {
    const result = normalizeTestimonial({ name: 'Sarah M.', text: 'Great work on our renovation.' });
    expect(result.author).toBe('Sarah M.');
    expect(result.quote).toBe('Great work on our renovation.');
  });

  it('normalizes reviewer→author', () => {
    const result = normalizeTestimonial({ reviewer: 'Sarah M.', review: 'Great work!' });
    expect(result.author).toBe('Sarah M.');
    expect(result.quote).toBe('Great work!');
  });

  it('normalizes content→quote', () => {
    const result = normalizeTestimonial({ author: 'Sarah M.', content: 'Great work!' });
    expect(result.quote).toBe('Great work!');
  });

  it('normalizes type→project_type', () => {
    const result = normalizeTestimonial({ author: 'Sarah', quote: 'Good', type: 'Kitchen' });
    expect(result.project_type).toBe('Kitchen');
  });

  it('normalizes project→project_type', () => {
    const result = normalizeTestimonial({ author: 'Sarah', quote: 'Good', project: 'Bathroom' });
    expect(result.project_type).toBe('Bathroom');
  });

  it('returns empty strings for missing fields', () => {
    const result = normalizeTestimonial({});
    expect(result.author).toBe('');
    expect(result.quote).toBe('');
    expect(result.project_type).toBe('');
  });

  it('prefers canonical field names over variants', () => {
    const result = normalizeTestimonial({
      author: 'Canonical',
      name: 'Variant',
      quote: 'Canonical quote',
      text: 'Variant text',
    });
    expect(result.author).toBe('Canonical');
    expect(result.quote).toBe('Canonical quote');
  });
});

describe('filterTestimonials with normalization', () => {
  it('accepts testimonials using name/text field names', () => {
    const input = [
      { name: 'Sarah M., London', text: 'Excellent work on our kitchen renovation. Very professional team.' },
      { name: 'James R., Kitchener', text: 'Transformed our basement into a beautiful living space.' },
    ];
    const result = filterTestimonials(input);
    expect(result).toHaveLength(2);
    expect(result[0].author).toBe('Sarah M., London');
    expect(result[0].quote).toBe('Excellent work on our kitchen renovation. Very professional team.');
  });

  it('accepts mixed field name styles', () => {
    const input = [
      { author: 'Sarah M.', quote: 'Excellent craftsmanship and great service from the team.' },
      { name: 'James R.', text: 'Transformed our basement into a beautiful living space.' },
      { reviewer: 'Priya K.', review: 'Outstanding renovation quality and attention to detail.' },
    ];
    const result = filterTestimonials(input);
    expect(result).toHaveLength(3);
  });
});

// ─── normalizeAboutCopy (Issue #5 — Mar 8, 2026) ────────────────────────────

describe('normalizeAboutCopy', () => {
  it('wraps a string in an array', () => {
    expect(normalizeAboutCopy('About us paragraph.')).toEqual(['About us paragraph.']);
  });

  it('passes through a valid array', () => {
    expect(normalizeAboutCopy(['Para 1', 'Para 2'])).toEqual(['Para 1', 'Para 2']);
  });

  it('filters empty strings from array', () => {
    expect(normalizeAboutCopy(['Para 1', '', '  ', 'Para 2'])).toEqual(['Para 1', 'Para 2']);
  });

  it('returns [] for null', () => {
    expect(normalizeAboutCopy(null)).toEqual([]);
  });

  it('returns [] for undefined', () => {
    expect(normalizeAboutCopy(undefined)).toEqual([]);
  });

  it('returns [] for empty string', () => {
    expect(normalizeAboutCopy('')).toEqual([]);
  });

  it('returns [] for whitespace-only string', () => {
    expect(normalizeAboutCopy('   ')).toEqual([]);
  });

  it('trims string values', () => {
    expect(normalizeAboutCopy('  Hello world  ')).toEqual(['Hello world']);
  });

  it('returns [] for non-string non-array values', () => {
    expect(normalizeAboutCopy(42)).toEqual([]);
    expect(normalizeAboutCopy(true)).toEqual([]);
    expect(normalizeAboutCopy({})).toEqual([]);
  });
});

// ─── diversifyPortfolioTitles (Issue #4 — Mar 8, 2026) ──────────────────────

describe('diversifyPortfolioTitles', () => {
  it('leaves diverse titles unchanged', () => {
    const input = [
      { title: 'Kitchen Renovation', image_url: 'https://img1.jpg' },
      { title: 'Bathroom Remodel', image_url: 'https://img2.jpg' },
      { title: 'Basement Finishing', image_url: 'https://img3.jpg' },
    ];
    const result = diversifyPortfolioTitles(input);
    expect(result.map(p => p.title)).toEqual(['Kitchen Renovation', 'Bathroom Remodel', 'Basement Finishing']);
  });

  it('diversifies when >50% share the same title', () => {
    const input = [
      { title: 'Custom Renovation', image_url: 'https://img1.jpg', service_type: 'Kitchen' },
      { title: 'Custom Renovation', image_url: 'https://img2.jpg', service_type: 'Bathroom' },
      { title: 'Unique Title', image_url: 'https://img3.jpg' },
    ];
    const result = diversifyPortfolioTitles(input);
    // First two should be diversified, third should stay
    expect(result[0].title).toBe('Kitchen Renovation');
    expect(result[1].title).toBe('Bathroom Renovation');
    expect(result[2].title).toBe('Unique Title');
  });

  it('detects known generic titles', () => {
    const input = [
      { title: 'Renovation', image_url: 'https://img1.jpg', service_type: 'Basement' },
      { title: 'Project', image_url: 'https://img2.jpg', service_type: 'Kitchen' },
      { title: 'Portfolio', image_url: 'https://img3.jpg' },
    ];
    const result = diversifyPortfolioTitles(input);
    expect(result[0].title).toBe('Basement Renovation');
    expect(result[1].title).toBe('Kitchen Renovation');
    expect(result[2].title).toBe('Project 1'); // no room type → fallback
  });

  it('uses "Project N" when no room type available', () => {
    const input = [
      { title: 'Custom Renovation', image_url: 'https://img1.jpg' },
      { title: 'Custom Renovation', image_url: 'https://img2.jpg' },
    ];
    const result = diversifyPortfolioTitles(input);
    expect(result[0].title).toBe('Project 1');
    expect(result[1].title).toBe('Project 2');
  });

  it('returns single-item portfolio unchanged', () => {
    const input = [{ title: 'Custom Renovation', image_url: 'https://img1.jpg' }];
    const result = diversifyPortfolioTitles(input);
    expect(result[0].title).toBe('Custom Renovation');
  });

  it('does not modify original objects', () => {
    const original = { title: 'Custom Renovation', image_url: 'https://img1.jpg', service_type: 'Kitchen' };
    const input = [original, { title: 'Custom Renovation', image_url: 'https://img2.jpg' }];
    diversifyPortfolioTitles(input);
    expect(original.title).toBe('Custom Renovation'); // original unchanged
  });
});

describe('filterPortfolio with diversification', () => {
  it('diversifies generic titles after filtering', () => {
    const input = [
      { title: 'Custom Renovation', image_url: 'https://img1.jpg', service_type: 'Kitchen' },
      { title: 'Custom Renovation', image_url: 'https://img2.jpg', service_type: 'Bathroom' },
      { title: '', image_url: 'https://img3.jpg' }, // filtered out (no title)
    ];
    const result = filterPortfolio(input);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Kitchen Renovation');
    expect(result[1].title).toBe('Bathroom Renovation');
  });
});

// ─── detectForeignBrandNames (Issue #5 — Mar 8, 2026) ───────────────────────

describe('detectForeignBrandNames', () => {
  it('returns empty for clean data', () => {
    const data = {
      about_copy: ['We are Acme Renovations, serving Ontario since 2005.'],
      why_choose_us: [{ description: 'Best in the business.' }],
    };
    const result = detectForeignBrandNames(data, 'Acme Renovations');
    expect(result).toHaveLength(0);
  });

  it('detects "Manzine Contracting" in another tenants data', () => {
    const data = {
      about_copy: ['Manzine Contracting has been providing quality renovations since 1998.'],
    };
    const result = detectForeignBrandNames(data, 'Ancaster Home Renovations');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].foreignName).toMatch(/Manzine Contracting/);
  });

  it('ignores the tenants own name', () => {
    const data = {
      about_copy: ['Ancaster Home Renovations is your trusted partner for renovations.'],
    };
    const result = detectForeignBrandNames(data, 'Ancaster Home Renovations');
    expect(result).toHaveLength(0);
  });

  it('handles aboutCopy as string', () => {
    const data = {
      about_copy: 'Smith Contracting did our foundation work.',
    };
    const result = detectForeignBrandNames(data, 'Jones Construction');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles aboutCopy as array', () => {
    const data = {
      about_copy: ['Para 1 with no names.', 'Para 2 mentions Widget Builders somehow.'],
    };
    const result = detectForeignBrandNames(data, 'Other Company');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].foreignName).toMatch(/Widget Builders/);
  });

  it('returns empty when no business name provided', () => {
    const data = { about_copy: ['Smith Contracting is great.'] };
    expect(detectForeignBrandNames(data, '')).toHaveLength(0);
    expect(detectForeignBrandNames(data, null)).toHaveLength(0);
  });

  it('checks why_choose_us field', () => {
    const data = {
      why_choose_us: [{ title: 'Quality', description: 'Unlike Random Homes, we deliver on time.' }],
    };
    const result = detectForeignBrandNames(data, 'Our Company');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].field).toBe('why_choose_us');
  });

  it('checks mission field', () => {
    const data = {
      mission: 'Based on principles learned at Big Corp Construction, we strive for excellence.',
    };
    const result = detectForeignBrandNames(data, 'My Renovations');
    expect(result.length).toBeGreaterThan(0);
  });

  it('skips very short prefix matches', () => {
    const data = {
      about_copy: ['We do construction work.'], // "do construction" — prefix too short
    };
    const result = detectForeignBrandNames(data, 'My Renovations');
    expect(result).toHaveLength(0);
  });
});
