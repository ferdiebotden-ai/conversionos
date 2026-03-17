import { createServiceClient } from '@/lib/db/server';
import { getSiteIdAsync } from '@/lib/db/site';
import type { SectionId } from '@/lib/section-types';

const DEFAULT_HOMEPAGE_LAYOUT: SectionId[] = [
  'hero:visualizer-teardown',
  'trust:badge-strip',
  'misc:visualizer-teaser',
  'services:grid-3-cards',
  'about:split-image-copy',
  'gallery:masonry-grid',
  'testimonials:cards-carousel',
  'cta:full-width-primary',
];

const DEFAULT_ABOUT_LAYOUT: SectionId[] = [
  'misc:breadcrumb-hero',
  'about:split-image-copy',
  'misc:mission-statement',
  'trust:badge-strip',
  'testimonials:cards-carousel',
  'misc:service-area',
  'cta:full-width-primary',
];

const DEFAULT_SERVICES_LAYOUT: SectionId[] = [
  'misc:breadcrumb-hero',
  'services:grid-3-cards',
  'gallery:masonry-grid',
  'testimonials:cards-carousel',
  'cta:full-width-primary',
];

const DEFAULT_CONTACT_LAYOUT: SectionId[] = [
  'misc:breadcrumb-hero',
  'contact:form-with-map',
  'trust:badge-strip',
];

const DEFAULT_PROJECTS_LAYOUT: SectionId[] = [
  'misc:breadcrumb-hero',
  'gallery:masonry-grid',
  'testimonials:cards-carousel',
  'cta:full-width-primary',
];

const DEFAULT_LAYOUTS: Record<string, SectionId[]> = {
  homepage: DEFAULT_HOMEPAGE_LAYOUT,
  about: DEFAULT_ABOUT_LAYOUT,
  services: DEFAULT_SERVICES_LAYOUT,
  contact: DEFAULT_CONTACT_LAYOUT,
  projects: DEFAULT_PROJECTS_LAYOUT,
};

export {
  DEFAULT_HOMEPAGE_LAYOUT,
  DEFAULT_ABOUT_LAYOUT,
  DEFAULT_SERVICES_LAYOUT,
  DEFAULT_CONTACT_LAYOUT,
  DEFAULT_PROJECTS_LAYOUT,
};

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

export async function getLayoutFlags(): Promise<{ custom_nav?: boolean; custom_footer?: boolean; hide_attribution?: boolean }> {
  try {
    const siteId = await getSiteIdAsync();
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('site_id', siteId)
      .eq('key', 'layout_flags')
      .single();
    return (data?.value as Record<string, boolean>) ?? {};
  } catch {
    return {};
  }
}
