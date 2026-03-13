'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { FadeInUp } from '@/components/motion';
import {
  VisualizerTeaser as VisualizerTeaserBase,
  type PortfolioImage,
} from '@/components/home/visualizer-teaser';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function MiscVisualizerTeaser({ className }: Props) {
  // Always use the default static transformations (same kitchen, multiple AI styles).
  // Portfolio images are different rooms — pairing them as before/after is misleading.
  return (
    <section className={`px-4 py-10 md:py-20 ${className ?? ''}`}>
      <div className="container mx-auto">
        <FadeInUp>
          <VisualizerTeaserBase />
        </FadeInUp>
      </div>
    </section>
  );
}
