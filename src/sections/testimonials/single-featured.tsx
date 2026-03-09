'use client';

import { useState } from 'react';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { FadeInUp } from '@/components/motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function TestimonialsSingleFeatured({ branding, config, className }: Props) {
  const testimonials = config.testimonials ?? [];
  const [index, setIndex] = useState(0);

  if (testimonials.length === 0) return null;

  const current = testimonials[index]!;
  const hasPrev = index > 0;
  const hasNext = index < testimonials.length - 1;

  return (
    <section className={`py-16 sm:py-20 ${className ?? ''}`}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
        <FadeInUp>
          {/* Decorative quotation mark */}
          <span
            className="block text-6xl font-serif leading-none text-primary/20 select-none"
            aria-hidden="true"
          >
            &ldquo;
          </span>

          <blockquote className="mt-4 text-xl md:text-2xl italic leading-relaxed text-foreground">
            {current.quote}
          </blockquote>

          <div className="mt-6">
            <p className="font-semibold text-foreground">{current.author}</p>
            <p className="text-sm text-muted-foreground">{current.projectType}</p>
          </div>

          {testimonials.length > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                onClick={() => setIndex((i) => i - 1)}
                disabled={!hasPrev}
                aria-label="Previous testimonial"
                className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="size-5" />
              </button>

              <span className="text-xs text-muted-foreground tabular-nums">
                {index + 1} / {testimonials.length}
              </span>

              <button
                onClick={() => setIndex((i) => i + 1)}
                disabled={!hasNext}
                aria-label="Next testimonial"
                className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          )}
        </FadeInUp>
      </div>
    </section>
  );
}
