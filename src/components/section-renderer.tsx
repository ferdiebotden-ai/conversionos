'use client';

import { getSection } from '@/lib/section-registry';
import type { SectionId, SectionBaseProps } from '@/lib/section-types';
import type { Branding } from '@/lib/branding';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';

// Side-effect import: registers all section components
import '@/sections/register';

/** Map section category to anchor ID for scroll-spy navigation */
function getSectionAnchorId(sectionId: SectionId): string | null {
  const category = sectionId.split(':')[0] ?? '';
  const ANCHOR_MAP: Record<string, string> = {
    hero: 'hero',
    services: 'services',
    gallery: 'projects',
    about: 'about',
    contact: 'contact',
    testimonials: 'testimonials',
    trust: 'trust',
    cta: 'cta',
  };
  // Handle misc sections by sub-type
  if (category === 'misc') {
    if (sectionId.includes('process')) return 'how-it-works';
    if (sectionId.includes('service-area')) return 'service-area';
    if (sectionId.includes('breadcrumb')) return null; // No anchor for breadcrumbs
    return null;
  }
  if (category === 'custom') {
    if (sectionId.includes('services')) return 'services';
    if (sectionId.includes('gallery') || sectionId.includes('portfolio') || sectionId.includes('projects')) return 'projects';
    if (sectionId.includes('process')) return 'how-it-works';
    if (sectionId.includes('about')) return 'about';
    if (sectionId.includes('testimonials')) return 'testimonials';
    if (sectionId.includes('contact')) return 'contact';
    if (sectionId.includes('cta')) return 'cta';
    return null;
  }
  return ANCHOR_MAP[category] ?? null;
}

interface Props {
  sections: SectionId[];
  branding: Branding;
  config: CompanyConfig;
  tokens?: SectionBaseProps['tokens'] | undefined;
}

export function SectionRenderer({ sections, branding, config, tokens }: Props) {
  return (
    <>
      {sections.map((sectionId, index) => {
        const Component = getSection(sectionId);
        if (!Component) {
          console.warn(`Section not found: ${sectionId}`);
          return null;
        }
        const anchorId = getSectionAnchorId(sectionId);
        return (
          <div key={`${sectionId}-${index}`} id={anchorId ?? undefined}>
            <Component
              branding={branding}
              config={config}
              tokens={tokens ?? undefined}
            />
          </div>
        );
      })}
    </>
  );
}
