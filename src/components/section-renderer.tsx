'use client';

import { getSection } from '@/lib/section-registry';
import type { SectionId, SectionBaseProps } from '@/lib/section-types';
import type { Branding } from '@/lib/branding';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';

// Side-effect import: registers all section components
import '@/sections/register';

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
        return (
          <Component
            key={`${sectionId}-${index}`}
            branding={branding}
            config={config}
            tokens={tokens ?? undefined}
          />
        );
      })}
    </>
  );
}
