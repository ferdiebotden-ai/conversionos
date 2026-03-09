/**
 * Page Layout Module — Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Track mock return values so individual tests can change them
const mockSingleReturn = { data: null };

vi.mock('@/lib/db/server', () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: function eqFn() {
          return {
            eq: function eqFn2() {
              return {
                single: () => Promise.resolve(mockSingleReturn),
              };
            },
          };
        },
      }),
    }),
  }),
}));

vi.mock('@/lib/db/site', () => ({
  getSiteIdAsync: () => Promise.resolve('test-tenant'),
}));

const { DEFAULT_HOMEPAGE_LAYOUT, getPageLayout } = await import('@/lib/page-layout');

describe('DEFAULT_HOMEPAGE_LAYOUT', () => {
  it('has exactly 8 entries', () => {
    expect(DEFAULT_HOMEPAGE_LAYOUT).toHaveLength(8);
  });

  it('all entries follow "category:variant" pattern', () => {
    for (const entry of DEFAULT_HOMEPAGE_LAYOUT) {
      expect(entry).toMatch(/^[a-z]+:[a-z0-9-]+$/);
    }
  });

  it('starts with hero:full-bleed-overlay', () => {
    expect(DEFAULT_HOMEPAGE_LAYOUT[0]).toBe('hero:full-bleed-overlay');
  });

  it('ends with cta:full-width-primary', () => {
    expect(DEFAULT_HOMEPAGE_LAYOUT[DEFAULT_HOMEPAGE_LAYOUT.length - 1]).toBe('cta:full-width-primary');
  });

  it('contains all expected sections in order', () => {
    expect(DEFAULT_HOMEPAGE_LAYOUT).toEqual([
      'hero:full-bleed-overlay',
      'trust:badge-strip',
      'misc:visualizer-teaser',
      'services:grid-3-cards',
      'about:split-image-copy',
      'gallery:masonry-grid',
      'testimonials:cards-carousel',
      'cta:full-width-primary',
    ]);
  });
});

describe('getPageLayout', () => {
  beforeEach(() => {
    mockSingleReturn.data = null;
  });

  it('returns DEFAULT_HOMEPAGE_LAYOUT when no DB data exists', async () => {
    const layout = await getPageLayout('homepage');
    expect(layout).toEqual(DEFAULT_HOMEPAGE_LAYOUT);
  });

  it('returns DEFAULT_HOMEPAGE_LAYOUT for default argument', async () => {
    const layout = await getPageLayout();
    expect(layout).toEqual(DEFAULT_HOMEPAGE_LAYOUT);
  });

  it('returns DEFAULT_HOMEPAGE_LAYOUT for unknown page slugs', async () => {
    const layout = await getPageLayout('nonexistent-page');
    expect(layout).toEqual(DEFAULT_HOMEPAGE_LAYOUT);
  });

  it('returns custom layout from DB when available', async () => {
    const customLayout = [
      'hero:full-bleed-overlay',
      'services:grid-3-cards',
      'cta:full-width-primary',
    ];
    // Mutate the shared mock return value
    (mockSingleReturn as Record<string, unknown>).data = {
      value: { homepage: customLayout },
    };

    const layout = await getPageLayout('homepage');
    expect(layout).toEqual(customLayout);
  });
});
