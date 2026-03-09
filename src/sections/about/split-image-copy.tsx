'use client';

import Image from 'next/image';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { FadeInUp } from '@/components/motion';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function AboutSplitImageCopy({ branding, config, className }: Props) {
  const imageUrl = config.aboutImageUrl || config.heroImageUrl;
  const hasImage = Boolean(imageUrl);

  return (
    <section className={`py-16 px-4 sm:px-6 lg:px-8 ${className ?? ''}`}>
      <div
        className={`mx-auto max-w-6xl ${
          hasImage
            ? 'grid md:grid-cols-2 gap-12 items-center'
            : 'max-w-3xl'
        }`}
      >
        {hasImage && (
          <FadeInUp>
            <div className="aspect-[4/3] rounded-2xl overflow-hidden relative">
              <Image
                src={imageUrl}
                alt={`About ${branding.name}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </FadeInUp>
        )}

        <FadeInUp>
          <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">
              About {branding.name}
            </h2>

            {config.aboutCopy.map((paragraph, i) => (
              <p key={i} className="text-muted-foreground leading-relaxed">
                {paragraph}
              </p>
            ))}

            {config.mission && (
              <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
                {config.mission}
              </blockquote>
            )}
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
