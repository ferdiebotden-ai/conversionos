/**
 * Mock data fixtures for unit tests.
 */

/** Mock target from Turso DB */
export const mockTarget = {
  id: 42,
  company_name: 'Test Reno Inc.',
  slug: 'test-reno',
  website: 'https://www.testreno.com',
  city: 'London',
  territory: 'London',
  status: 'qualified',
  score: 85,
  google_rating: 4.6,
  google_review_count: 32,
  years_in_business: 5,
  icp_score: null,
  icp_breakdown: null,
  bespoke_status: null,
  bespoke_score: null,
};

/** Mock scraped data (minimal valid shape) */
export const mockScrapedData = {
  business_name: 'Test Reno Inc.',
  phone: '519-555-0100',
  email: 'info@testreno.com',
  address: '123 Main St, London, ON',
  primary_color_hex: '#2563eb',
  services: [
    { name: 'Kitchen Renovation', slug: 'kitchen-renovation' },
    { name: 'Bathroom Renovation', slug: 'bathroom-renovation' },
  ],
  testimonials: [
    { name: 'John S.', text: 'Great work on our kitchen!', rating: 5 },
  ],
  logo_url: 'https://example.com/logo.png',
  _branding: {
    colors: [{ hex: '#2563eb', role: 'primary' }],
    fonts: [],
    personality: {},
    logo_extraction: { level: 2, method: 'dom', confidence: 0.8 },
  },
};

/** Mock visual QA result (passing) */
export const mockQaResultPass = {
  logo_fidelity: 4,
  colour_match: 5,
  copy_accuracy: 4,
  layout_integrity: 5,
  brand_cohesion: 4,
  notes: 'Excellent rendering with strong brand cohesion.',
  average: 4.4,
  pass: true,
  screenshots: {
    desktop: '/tmp/desktop.png',
    mobile: '/tmp/mobile.png',
  },
};

/** Mock visual QA result (failing) */
export const mockQaResultFail = {
  logo_fidelity: 2,
  colour_match: 3,
  copy_accuracy: 4,
  layout_integrity: 4,
  brand_cohesion: 3,
  notes: 'Logo is broken and colours do not match brand.',
  average: 3.2,
  pass: false,
  screenshots: {
    desktop: '/tmp/desktop.png',
    mobile: '/tmp/mobile.png',
  },
};

/** Mock proxy.ts content for merge tests */
export const mockProxyContent = `import { NextResponse, type NextRequest } from 'next/server';

const DOMAIN_TO_SITE: Record<string, string> = {
  'mccarty.norbotsystems.com': 'mccarty-squared',
  'redwhite.norbotsystems.com': 'redwhitereno',
  'conversionos-demo.norbotsystems.com': 'demo',
};

export async function proxy(request: NextRequest) {
  return NextResponse.next();
}
`;

/** Mock proxy fragment */
export const mockProxyFragment = {
  domain: 'newtenant.norbotsystems.com',
  siteId: 'newtenant',
};

/** Mock ICP breakdown */
export const mockIcpBreakdown = {
  template_fit: 15,
  sophistication_gap: 18,
  years_in_business: 12,
  google_reviews: 10,
  geography: 12,
  company_size: 12,
  total: 79,
  notes: 'sophistication=template, size=small',
};
