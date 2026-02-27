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
    { name: 'Kitchen Renovation', slug: 'kitchen-renovation', description: 'Full kitchen remodel including cabinets and countertops.' },
    { name: 'Bathroom Renovation', slug: 'bathroom-renovation', description: 'Complete bathroom transformation with modern finishes.' },
  ],
  testimonials: [
    { author: 'John S.', quote: 'Great work on our kitchen! Professional team and excellent results throughout.', rating: 5 },
    { author: 'Sarah M.', quote: 'Transformed our bathroom completely. Would highly recommend their services.', rating: 5 },
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

/** Mock company_profile with trustMetrics (camelCase) */
export const mockCompanyProfile = {
  services: [
    { name: 'Kitchen Renovation', slug: 'kitchen-renovation', description: 'Full kitchen remodel with custom cabinets.' },
    { name: 'Bathroom Remodel', slug: 'bathroom-remodel', description: 'Complete bathroom transformation services.' },
  ],
  trustMetrics: {
    google_rating: '4.6',
    projects_completed: '32+ Reviews',
    years_in_business: '5',
    licensed_insured: true,
  },
  trustBadges: [
    { label: 'Licensed & Insured', icon: 'shield-check' },
    { label: 'WSIB Covered', icon: 'hard-hat' },
  ],
  processSteps: [
    { title: 'Consultation', description: 'Free in-home consultation.' },
    { title: 'Design', description: 'Custom design and planning.' },
  ],
  values: [
    { title: 'Quality', description: 'Best materials and craftsmanship.' },
  ],
};

/** Mock content integrity result (passing) */
export const mockContentIntegrityPass = {
  passed: true,
  violations: [],
  summary: {
    site_id: 'test-reno',
    pages_checked: 4,
    demo_leakage: 0,
    broken_images: 0,
    demo_images: 0,
    empty_sections: 0,
    fabrication: 0,
    placeholder_text: 0,
    business_name: 0,
    copyright_format: 0,
    total_violations: 0,
    passed: true,
  },
};

/** Mock content integrity result (failing) */
export const mockContentIntegrityFail = {
  passed: false,
  violations: [
    { check: 'demo_leakage', page: '/', leaked_string: '(226) 444-3478', context: 'Call us: (226) 444-3478' },
    { check: 'fabrication', field: 'trust_badges', source: 'ai_generated' },
  ],
  summary: {
    site_id: 'test-reno',
    pages_checked: 4,
    demo_leakage: 1,
    broken_images: 0,
    demo_images: 0,
    empty_sections: 0,
    fabrication: 1,
    placeholder_text: 0,
    business_name: 0,
    copyright_format: 0,
    total_violations: 2,
    passed: false,
  },
};

/** Mock audit report input */
export const mockAuditInput = {
  contentIntegrity: mockContentIntegrityPass,
  visualQa: {
    logo_fidelity: 4,
    colour_match: 5,
    copy_accuracy: 4,
    layout_integrity: 5,
    brand_cohesion: 4,
    average: 4.4,
    pass: true,
    notes: 'Excellent rendering.',
  },
  autoFixes: [],
  siteId: 'test-reno',
  businessName: 'Test Reno Inc.',
};
