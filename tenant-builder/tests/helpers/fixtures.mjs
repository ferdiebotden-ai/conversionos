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

/** Mock live site audit result (passing) */
export const mockLiveSiteAuditPass = {
  passed: true,
  checks: [
    { check: 'cross_page_branding', passed: true, violations: [] },
    { check: 'navigation_integrity', passed: true, links_checked: 12, violations: [] },
    { check: 'responsive_layout', passed: true, violations: [] },
    { check: 'wcag_contrast', passed: true, primary: '#2563eb', contrast_white: 4.56, wcag_aa_normal: true, wcag_aa_large: true, violations: [] },
    { check: 'seo_meta', passed: true, violations: [] },
    { check: 'image_performance', passed: true, total_images: 8, violations: [] },
    { check: 'footer_consistency', passed: true, violations: [] },
    { check: 'admin_route_gating', passed: true, tier: 'accelerate', violations: [] },
  ],
  violations: [],
  summary: { checks_run: 8, checks_passed: 8 },
};

/** Mock live site audit result (failing) */
export const mockLiveSiteAuditFail = {
  passed: false,
  checks: [
    { check: 'cross_page_branding', passed: false, violations: [{ issue: 'primary_mismatch', page: '/about' }] },
    { check: 'navigation_integrity', passed: true, links_checked: 10, violations: [] },
    { check: 'responsive_layout', passed: true, violations: [] },
    { check: 'wcag_contrast', passed: false, primary: '#ff0', contrast_white: 1.07, wcag_aa_normal: false, wcag_aa_large: false, violations: [{ issue: 'low_contrast', level: 'fail' }] },
    { check: 'seo_meta', passed: true, violations: [] },
    { check: 'image_performance', passed: true, total_images: 6, violations: [] },
    { check: 'footer_consistency', passed: false, violations: [{ issue: 'missing_business_name' }] },
    { check: 'admin_route_gating', passed: true, tier: 'accelerate', violations: [] },
  ],
  violations: [
    { check: 'cross_page_branding', issue: 'primary_mismatch', page: '/about' },
    { check: 'wcag_contrast', issue: 'low_contrast', level: 'fail' },
    { check: 'footer_consistency', issue: 'missing_business_name' },
  ],
  summary: { checks_run: 8, checks_passed: 5 },
};

/** Mock original-vs-demo result (passing) */
export const mockOriginalVsDemoPass = {
  passed: true,
  matchScore: 86,
  comparisons: [
    { field: 'business_name', match: true, expected: 'Test Reno Inc.', live: 'Test Reno Inc.', score: 100 },
    { field: 'phone', match: true, expected: '519-555-0100', live: '519-555-0100', score: 100 },
    { field: 'email', match: true, expected: 'info@testreno.com', live: 'info@testreno.com', score: 100 },
    { field: 'service_count', match: true, expected: 2, live: 2, score: 100 },
    { field: 'testimonials', match: true, expected_authors: 2, found_count: 1, score: 100 },
    { field: 'primary_colour', match: true, expected: '#2563eb', live: 'oklch(0.588 0.108 180)', delta_e: 1.2, score: 100 },
    { field: 'logo_presence', match: false, type: 'none', score: 0 },
  ],
  summary: { total_comparisons: 7, matched: 6, failed: 1, skipped: 0 },
};

/** Mock original-vs-demo result (failing) */
export const mockOriginalVsDemoFail = {
  passed: false,
  matchScore: 43,
  comparisons: [
    { field: 'business_name', match: false, expected: 'Test Reno Inc.', live: 'ConversionOS Demo', score: 0 },
    { field: 'phone', match: false, expected: '519-555-0100', live: '', score: 0 },
    { field: 'email', match: true, expected: 'info@testreno.com', live: 'info@testreno.com', score: 100 },
    { field: 'service_count', match: true, expected: 2, live: 3, score: 100 },
    { field: 'testimonials', match: false, expected_authors: 2, found_count: 0, score: 0 },
    { field: 'primary_colour', match: true, expected: '#2563eb', live: 'oklch(0.588 0.108 180)', delta_e: 1.2, score: 100 },
    { field: 'logo_presence', match: true, type: 'image', score: 100 },
  ],
  summary: { total_comparisons: 7, matched: 4, failed: 3, skipped: 0 },
};

/** Mock PDF branding check result (passing) */
export const mockPdfBrandingPass = {
  passed: true,
  violations: [],
  summary: {
    site_id: 'test-reno',
    has_data: true,
    has_logo: true,
    logo_is_svg: false,
    has_primary_colour: true,
    critical_violations: 0,
    warning_violations: 0,
  },
};

/** Mock PDF branding check result (failing) */
export const mockPdfBrandingFail = {
  passed: false,
  violations: [
    { check: 'demo_leakage', severity: 'critical', field: 'name', value: 'ConversionOS Demo' },
    { check: 'missing_field', severity: 'critical', field: 'phone', expected: 'non-empty' },
  ],
  summary: {
    site_id: 'test-reno',
    has_data: true,
    has_logo: false,
    logo_is_svg: false,
    has_primary_colour: true,
    critical_violations: 2,
    warning_violations: 0,
  },
};

/** Mock email branding check result (passing) */
export const mockEmailBrandingPass = {
  passed: true,
  violations: [],
  summary: {
    site_id: 'test-reno',
    has_data: true,
    templates_scanned: 3,
    outreach_scanned: true,
    critical_violations: 0,
    warning_violations: 0,
  },
};

/** Mock email branding check result (failing) */
export const mockEmailBrandingFail = {
  passed: false,
  violations: [
    { check: 'source_anti_pattern', severity: 'critical', template: 'quote-email', pattern: 'DEMO-' },
    { check: 'missing_field', severity: 'critical', field: 'name', expected: 'non-empty' },
  ],
  summary: {
    site_id: 'test-reno',
    has_data: true,
    templates_scanned: 3,
    outreach_scanned: true,
    critical_violations: 2,
    warning_violations: 0,
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
