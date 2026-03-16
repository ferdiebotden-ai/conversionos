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

export function MiscVisualizerTeaser({ config, className }: Props) {
  const portfolioImages: PortfolioImage[] = config.portfolio
    .filter(p => p.imageUrl && p.title)
    .map(p => ({ title: p.title, imageUrl: p.imageUrl }));

  return (
    <section className={`px-4 py-10 md:py-20 ${className ?? ''}`}>
      <div className="container mx-auto">
        <FadeInUp>
          <VisualizerTeaserBase portfolioImages={portfolioImages} />
        </FadeInUp>
      </div>
    </section>
  );
}
