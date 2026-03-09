'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { StaggerContainer, StaggerItem } from '@/components/motion';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function TestimonialsMinimalQuotes({ config, className }: Props) {
  const testimonials = config.testimonials ?? [];
  if (testimonials.length === 0) return null;

  return (
    <section className={`py-16 sm:py-20 ${className ?? ''}`}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <StaggerContainer className="space-y-16">
          {testimonials.map((t, i) => {
            const isEven = i % 2 === 1;
            return (
              <StaggerItem
                key={i}
                className={isEven ? 'text-right' : 'text-left'}
              >
                <blockquote className="text-xl md:text-2xl italic leading-relaxed text-foreground">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="mt-4">
                  <p className="text-sm font-semibold text-foreground">
                    {t.author}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.projectType}
                  </p>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}
