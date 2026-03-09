import { createServiceClient } from '@/lib/db/server';
import { getSiteIdAsync } from '@/lib/db/site';
import type { SectionId } from '@/lib/section-types';

const DEFAULT_HOMEPAGE_LAYOUT: SectionId[] = [
  'hero:full-bleed-overlay',
  'trust:badge-strip',
  'misc:visualizer-teaser',
  'services:grid-3-cards',
  'about:split-image-copy',
  'gallery:masonry-grid',
  'testimonials:cards-carousel',
  'cta:full-width-primary',
];

const DEFAULT_LAYOUTS: Record<string, SectionId[]> = {
  homepage: DEFAULT_HOMEPAGE_LAYOUT,
};

export { DEFAULT_HOMEPAGE_LAYOUT };

export async function getPageLayout(pageSlug: string = 'homepage'): Promise<SectionId[]> {
  try {
    const siteId = await getSiteIdAsync();
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('site_id', siteId)
      .eq('key', 'page_layouts')
      .single();

    if (data?.value) {
      const layouts = data.value as Record<string, SectionId[]>;
      if (layouts[pageSlug]) return layouts[pageSlug];
    }
  } catch {
    // Fall through to defaults
  }

  return DEFAULT_LAYOUTS[pageSlug] ?? DEFAULT_HOMEPAGE_LAYOUT;
}
