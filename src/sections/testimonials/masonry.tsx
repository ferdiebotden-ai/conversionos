'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { FadeInUp } from '@/components/motion';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function TestimonialsMasonry({ config, className }: Props) {
  const testimonials = config.testimonials ?? [];
  if (testimonials.length < 3) return null;

  return (
    <section className={`py-16 sm:py-20 ${className ?? ''}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          What Our Clients Say
        </h2>

        <FadeInUp>
          <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="mb-4 break-inside-avoid rounded-xl border border-border bg-card p-6 border-l-4 border-l-primary"
              >
                <blockquote className="text-sm leading-relaxed text-muted-foreground">
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
              </div>
            ))}
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
