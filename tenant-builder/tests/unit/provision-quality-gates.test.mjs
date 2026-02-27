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
