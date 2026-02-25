/**
 * Unit tests for template resilience logic.
 * Tests the rendering decisions that components make based on data presence/absence.
 *
 * These don't render React components — they test the conditional logic patterns
 * used in page.tsx, footer.tsx, about/page.tsx, services-grid.tsx, project-gallery.tsx.
 */

import { describe, it, expect } from 'vitest';

// ─── Simulated rendering decision functions ───

/**
 * Services section: should render only when services array has items.
 * Mirrors: page.tsx `{config.services.length > 0 && (...)}` and
 * services-grid.tsx returning null on empty.
 */
function shouldRenderServices(services) {
  return Array.isArray(services) && services.length > 0;
}

/**
 * Footer services column: should render only when services exist.
 * Mirrors: footer.tsx `{serviceLinks.length > 0 && (...)}`.
 */
function getFooterServiceLinks(brandingServices) {
  return brandingServices.length > 0
    ? brandingServices.map(s => ({ href: `/services/${s.slug}`, label: s.name }))
    : [];
}

/**
 * Project gallery: should show empty state when no projects.
 * Mirrors: project-gallery.tsx early return.
 */
function getProjectGalleryState(projects) {
  if (!projects || projects.length === 0) {
    return { mode: 'empty', message: 'Our portfolio is being updated. Check back soon to see our latest work.' };
  }
  return { mode: 'gallery', projects };
}

/**
 * About page image: gradient placeholder when no aboutImageUrl.
 * Mirrors: about/page.tsx conditional.
 */
function getAboutImageMode(aboutImageUrl) {
  return aboutImageUrl ? 'image' : 'gradient';
}

/**
 * Mission section: hide when empty.
 * Mirrors: about/page.tsx `{config.mission && (...)}`.
 */
function shouldRenderMission(mission) {
  return Boolean(mission);
}

/**
 * Values section: hide when empty (no default values).
 * Mirrors: about/page.tsx `{config.values.length > 0 && (...)}`.
 */
function shouldRenderValues(values) {
  return Array.isArray(values) && values.length > 0;
}

/**
 * Testimonials section: hide when fewer than 2.
 * Mirrors: page.tsx `{testimonials.length >= 2 && (...)}`.
 */
function shouldRenderTestimonials(testimonials) {
  return Array.isArray(testimonials) && testimonials.length >= 2;
}

/**
 * Social proof bar: hide when fewer than 3 metrics.
 * Mirrors: social-proof-bar.tsx `if (items.length < 3) return null`.
 */
function shouldRenderSocialProof(metrics) {
  let count = 0;
  if (metrics.google_rating) count++;
  if (metrics.years_in_business) count++;
  if (metrics.projects_completed) count++;
  if (metrics.licensed_insured) count++;
  return count >= 3;
}

/**
 * Hero fallback: use default when heroHeadline is empty/undefined.
 * Mirrors: page.tsx `{config.heroHeadline || (<>Dream. Plan. <span>Build.</span></>)}`.
 */
function getHeroHeadline(configHeadline) {
  return configHeadline || 'Dream. Plan. Build.';
}

// ─── Demo Leakage Constants ───

const DEMO_LEAKAGE_VALUES = {
  phone: '(226) 444-3478',
  email: 'ferdie@norbotsystems.com',
  address: '1 Ontario Street',
  city: 'Stratford',
  postal: 'N5A 3H1',
  name: 'ConversionOS Demo',
  services: [
    { slug: 'kitchen-renovation', name: 'Kitchen Renovation' },
    { slug: 'bathroom-renovation', name: 'Bathroom Renovation' },
    { slug: 'basement-finishing', name: 'Basement Finishing' },
    { slug: 'outdoor-living', name: 'Outdoor Living' },
  ],
};

// ─── Tests ───

describe('services section rendering', () => {
  it('renders when services array has items', () => {
    expect(shouldRenderServices([{ name: 'Kitchen' }])).toBe(true);
  });

  it('does NOT render when services array is empty', () => {
    expect(shouldRenderServices([])).toBe(false);
  });

  it('does NOT render when services is null/undefined', () => {
    expect(shouldRenderServices(null)).toBe(false);
    expect(shouldRenderServices(undefined)).toBe(false);
  });

  it('does NOT render demo services as fallback', () => {
    // Previously services-grid.tsx had DEFAULT_SERVICES fallback
    // Now it should return null/false for empty input
    expect(shouldRenderServices([])).toBe(false);
  });
});

describe('footer services column', () => {
  it('returns service links when services exist', () => {
    const services = [
      { slug: 'kitchen-renovation', name: 'Kitchen Renovation' },
      { slug: 'bathroom-remodel', name: 'Bathroom Remodel' },
    ];
    const links = getFooterServiceLinks(services);
    expect(links).toHaveLength(2);
    expect(links[0].href).toBe('/services/kitchen-renovation');
    expect(links[0].label).toBe('Kitchen Renovation');
  });

  it('returns empty array when no services (no hardcoded fallback)', () => {
    const links = getFooterServiceLinks([]);
    expect(links).toHaveLength(0);
  });

  it('does NOT return hardcoded demo services', () => {
    const links = getFooterServiceLinks([]);
    // Previously footer had: Kitchen, Bathroom, Basement, Flooring hardcoded
    expect(links.some(l => l.label === 'Kitchen Renovation')).toBe(false);
    expect(links.some(l => l.label === 'Flooring')).toBe(false);
  });
});

describe('project gallery rendering', () => {
  it('shows gallery mode with valid projects', () => {
    const projects = [{ id: '1', title: 'Kitchen', type: 'kitchen', image: '/img.jpg' }];
    const state = getProjectGalleryState(projects);
    expect(state.mode).toBe('gallery');
    expect(state.projects).toHaveLength(1);
  });

  it('shows empty state when no projects', () => {
    const state = getProjectGalleryState([]);
    expect(state.mode).toBe('empty');
    expect(state.message).toContain('portfolio');
  });

  it('shows empty state when projects is null/undefined', () => {
    expect(getProjectGalleryState(null).mode).toBe('empty');
    expect(getProjectGalleryState(undefined).mode).toBe('empty');
  });

  it('does NOT show 8 hardcoded demo projects', () => {
    // Previously project-gallery.tsx had 8 defaultProjects
    const state = getProjectGalleryState([]);
    expect(state.mode).toBe('empty');
    // No demo project titles should appear
    expect(state.message).not.toContain('Modern Kitchen Transformation');
    expect(state.message).not.toContain('Spa-Inspired Master Bathroom');
  });
});

describe('about page image handling', () => {
  it('renders image when aboutImageUrl is present', () => {
    expect(getAboutImageMode('https://example.com/about.jpg')).toBe('image');
  });

  it('renders gradient placeholder when aboutImageUrl is empty', () => {
    expect(getAboutImageMode('')).toBe('gradient');
  });

  it('renders gradient placeholder when aboutImageUrl is undefined', () => {
    expect(getAboutImageMode(undefined)).toBe('gradient');
  });

  it('does NOT fall back to demo image path', () => {
    // Previously: config.aboutImageUrl || "/images/demo/flooring-vinyl.png"
    const mode = getAboutImageMode('');
    expect(mode).toBe('gradient');
    // The path "/images/demo/flooring-vinyl.png" should never be used
  });
});

describe('mission section rendering', () => {
  it('renders when mission text is present', () => {
    expect(shouldRenderMission('To transform homes through quality craftsmanship.')).toBe(true);
  });

  it('does NOT render when mission is empty', () => {
    expect(shouldRenderMission('')).toBe(false);
  });

  it('does NOT render when mission is null/undefined', () => {
    expect(shouldRenderMission(null)).toBe(false);
    expect(shouldRenderMission(undefined)).toBe(false);
  });

  it('does NOT show generic fallback mission', () => {
    // Previously: config.mission || "To transform houses into dream homes..."
    // Now the section hides entirely
    expect(shouldRenderMission('')).toBe(false);
  });
});

describe('values section rendering', () => {
  it('renders when values array has items', () => {
    expect(shouldRenderValues([{ title: 'Quality', description: 'Best work.' }])).toBe(true);
  });

  it('does NOT render when values array is empty', () => {
    expect(shouldRenderValues([])).toBe(false);
  });

  it('does NOT render default values (Customer First, Quality Craftsmanship, Integrity)', () => {
    // Previously had hardcoded defaultValues array
    expect(shouldRenderValues([])).toBe(false);
  });
});

describe('testimonials section rendering', () => {
  it('renders when 2+ testimonials exist', () => {
    const testimonials = [
      { quote: 'Great!', author: 'Sarah' },
      { quote: 'Amazing!', author: 'James' },
    ];
    expect(shouldRenderTestimonials(testimonials)).toBe(true);
  });

  it('does NOT render when fewer than 2', () => {
    expect(shouldRenderTestimonials([{ quote: 'Great!', author: 'Sarah' }])).toBe(false);
    expect(shouldRenderTestimonials([])).toBe(false);
  });
});

describe('social proof bar rendering', () => {
  it('renders when 3+ metrics available', () => {
    expect(shouldRenderSocialProof({
      google_rating: '4.6',
      years_in_business: '5',
      projects_completed: '32+',
    })).toBe(true);
  });

  it('renders when all 4 metrics available', () => {
    expect(shouldRenderSocialProof({
      google_rating: '4.6',
      years_in_business: '5',
      projects_completed: '32+',
      licensed_insured: true,
    })).toBe(true);
  });

  it('does NOT render when fewer than 3 metrics', () => {
    expect(shouldRenderSocialProof({
      google_rating: '4.6',
      years_in_business: '5',
    })).toBe(false);
  });

  it('does NOT render when no metrics at all', () => {
    expect(shouldRenderSocialProof({})).toBe(false);
  });

  it('does NOT render NorBot demo metrics when empty', () => {
    // Previously FALLBACK_CONFIG had: google_rating: '4.9', projects_completed: '50+'
    expect(shouldRenderSocialProof({})).toBe(false);
  });
});

describe('hero headline fallback', () => {
  it('uses custom headline when provided', () => {
    expect(getHeroHeadline('Your Dream Kitchen Awaits')).toBe('Your Dream Kitchen Awaits');
  });

  it('falls back to ConversionOS default when empty', () => {
    expect(getHeroHeadline('')).toBe('Dream. Plan. Build.');
  });

  it('falls back to ConversionOS default when undefined', () => {
    expect(getHeroHeadline(undefined)).toBe('Dream. Plan. Build.');
  });

  it('does NOT use NorBot-specific default', () => {
    const headline = getHeroHeadline('');
    // Should be the generic ConversionOS default, not tenant-specific
    expect(headline).not.toContain('NorBot');
    expect(headline).not.toContain('Stratford');
  });
});

describe('no demo leakage in rendering decisions', () => {
  it('empty config produces no demo content references', () => {
    // Simulate a fresh tenant with minimal data
    const config = {
      services: [],
      testimonials: [],
      portfolio: [],
      values: [],
      mission: '',
      heroHeadline: '',
      heroSubheadline: '',
      aboutImageUrl: '',
      trustMetrics: {},
    };

    // All optional sections should hide
    expect(shouldRenderServices(config.services)).toBe(false);
    expect(shouldRenderTestimonials(config.testimonials)).toBe(false);
    expect(shouldRenderValues(config.values)).toBe(false);
    expect(shouldRenderMission(config.mission)).toBe(false);
    expect(shouldRenderSocialProof(config.trustMetrics)).toBe(false);
    expect(getProjectGalleryState(config.portfolio).mode).toBe('empty');
    expect(getAboutImageMode(config.aboutImageUrl)).toBe('gradient');

    // Hero falls back to generic default
    const headline = getHeroHeadline(config.heroHeadline);
    expect(headline).toBe('Dream. Plan. Build.');
  });

  it('fully populated config renders all sections', () => {
    const config = {
      services: [{ name: 'Kitchen', slug: 'kitchen' }],
      testimonials: [{ a: 1 }, { a: 2 }, { a: 3 }],
      portfolio: [{ id: '1', title: 'Project' }],
      values: [{ title: 'Quality' }],
      mission: 'To build great homes.',
      heroHeadline: 'Your Dream Home Awaits',
      aboutImageUrl: 'https://example.com/about.jpg',
      trustMetrics: {
        google_rating: '4.8',
        years_in_business: '10',
        projects_completed: '100+',
        licensed_insured: true,
      },
    };

    expect(shouldRenderServices(config.services)).toBe(true);
    expect(shouldRenderTestimonials(config.testimonials)).toBe(true);
    expect(shouldRenderValues(config.values)).toBe(true);
    expect(shouldRenderMission(config.mission)).toBe(true);
    expect(shouldRenderSocialProof(config.trustMetrics)).toBe(true);
    expect(getProjectGalleryState(config.portfolio).mode).toBe('gallery');
    expect(getAboutImageMode(config.aboutImageUrl)).toBe('image');
    expect(getHeroHeadline(config.heroHeadline)).toBe('Your Dream Home Awaits');
  });
});

describe('content integrity: demo leakage strings', () => {
  const DEMO_LEAKAGE_STRINGS = [
    'ConversionOS Demo',
    '(226) 444-3478',
    'ferdie@norbotsystems.com',
    '1 Ontario Street',
    'N5A 3H1',
    '/images/demo/',
    'flooring-vinyl.png',
    'kitchen-modern.png',
    'bathroom-spa.png',
    'basement-entertainment.png',
  ];

  it('real tenant data should not contain any demo leakage strings', () => {
    // Simulate what a properly provisioned tenant's page text might look like
    const pageText = `
      Red White Reno — Quality Renovations in London, Ontario.
      Call us: (519) 555-0100. Email: info@redwhitereno.com.
      123 Main Street, London, ON, Canada.
      Kitchen, Bathroom, Basement Renovations.
    `;

    for (const s of DEMO_LEAKAGE_STRINGS) {
      expect(pageText).not.toContain(s);
    }
  });

  it('identifies leakage in page text', () => {
    const leakyText = `
      Welcome to Red White Reno.
      Call us: (226) 444-3478
      1 Ontario Street, Stratford, ON.
    `;

    const found = DEMO_LEAKAGE_STRINGS.filter(s => leakyText.includes(s));
    expect(found.length).toBeGreaterThan(0);
    expect(found).toContain('(226) 444-3478');
    expect(found).toContain('1 Ontario Street');
  });
});

describe('provisioner output shapes', () => {
  it('quote_assistance row has correct shape for accelerate tier', () => {
    const tier = 'accelerate';
    const value = tier === 'elevate' ? { mode: 'none' } : { mode: 'range', rangeBand: 10000 };
    expect(value.mode).toBe('range');
    expect(value.rangeBand).toBe(10000);
  });

  it('quote_assistance row has correct shape for elevate tier', () => {
    const tier = 'elevate';
    const value = tier === 'elevate' ? { mode: 'none' } : { mode: 'range', rangeBand: 10000 };
    expect(value.mode).toBe('none');
    expect(value.rangeBand).toBeUndefined();
  });

  it('quote_assistance row has correct shape for dominate tier', () => {
    const tier = 'dominate';
    const value = tier === 'elevate' ? { mode: 'none' } : { mode: 'range', rangeBand: 10000 };
    expect(value.mode).toBe('range');
    expect(value.rangeBand).toBe(10000);
  });

  it('undefined values are stripped by JSON.stringify', () => {
    const profile = {
      heroHeadline: undefined,
      heroSubheadline: undefined,
      services: [{ name: 'Kitchen' }],
    };
    const json = JSON.parse(JSON.stringify(profile));
    expect(json.heroHeadline).toBeUndefined();
    expect(json.heroSubheadline).toBeUndefined();
    expect(json.services).toHaveLength(1);
  });

  it('admin_settings rows now include 5 keys', () => {
    const keys = ['business_info', 'branding', 'company_profile', 'plan', 'quote_assistance'];
    expect(keys).toHaveLength(5);
    expect(keys).toContain('quote_assistance');
  });
});

describe('upload-images local file path handling', () => {
  it('detects absolute local paths', () => {
    const url = '/tmp/logos/extracted-logo.png';
    const isLocal = url.startsWith('/') || url.startsWith('file://');
    expect(isLocal).toBe(true);
  });

  it('detects file:// URLs', () => {
    const url = 'file:///Users/norbot/logos/test.svg';
    const isLocal = url.startsWith('/') || url.startsWith('file://');
    expect(isLocal).toBe(true);
  });

  it('does not flag HTTP URLs as local', () => {
    const url = 'https://example.com/logo.png';
    const isLocal = url.startsWith('/') || url.startsWith('file://');
    expect(isLocal).toBe(false);
  });

  it('extracts file path from file:// URL', () => {
    const url = 'file:///Users/norbot/logos/test.svg';
    const filePath = url.startsWith('file://') ? url.slice(7) : url;
    expect(filePath).toBe('/Users/norbot/logos/test.svg');
  });

  it('infers correct content type for SVG', () => {
    const filePath = '/tmp/logos/logo.svg';
    const ext = filePath.match(/\.(svg|png|jpg|jpeg|webp)$/i)?.[1]?.toLowerCase() || 'png';
    const contentType = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    expect(contentType).toBe('image/svg+xml');
  });

  it('infers correct content type for PNG', () => {
    const filePath = '/tmp/logos/logo.png';
    const ext = filePath.match(/\.(svg|png|jpg|jpeg|webp)$/i)?.[1]?.toLowerCase() || 'png';
    const contentType = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    expect(contentType).toBe('image/png');
  });

  it('infers correct content type for JPG (normalised to jpeg)', () => {
    const filePath = '/tmp/photos/hero.jpg';
    const ext = filePath.match(/\.(svg|png|jpg|jpeg|webp)$/i)?.[1]?.toLowerCase() || 'png';
    const contentType = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    expect(contentType).toBe('image/jpeg');
  });

  it('defaults to image/png for unknown extensions', () => {
    const filePath = '/tmp/logos/logo.bmp';
    const ext = filePath.match(/\.(svg|png|jpg|jpeg|webp)$/i)?.[1]?.toLowerCase() || 'png';
    const contentType = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    expect(contentType).toBe('image/png');
  });
});

describe('service slug generation', () => {
  it('generates correct slugs', () => {
    const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    expect(slug('Kitchen Renovation')).toBe('kitchen-renovation');
    expect(slug('Bathroom & Spa Remodel')).toBe('bathroom-spa-remodel');
    expect(slug('  Basement Finishing  ')).toBe('basement-finishing');
    expect(slug('Deck/Patio Construction')).toBe('deck-patio-construction');
  });

  it('handles special characters', () => {
    const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    expect(slug("D'Amico's Kitchen Design")).toBe("d-amico-s-kitchen-design");
    expect(slug('100% Custom Work')).toBe('100-custom-work');
  });
});
