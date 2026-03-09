'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { StaggerContainer, StaggerItem } from '@/components/motion';
import { Star, Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function TestimonialsCardsCarousel({ config, className }: Props) {
  const testimonials = config.testimonials ?? [];
  if (testimonials.length < 2) return null;

  return (
    <section className={`bg-muted/30 py-16 sm:py-20 ${className ?? ''}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          What Our Clients Say
        </h2>

        <StaggerContainer
          className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4"
        >
          {testimonials.map((t, i) => (
            <StaggerItem
              key={i}
              className="min-w-[300px] md:min-w-[400px] flex-shrink-0 snap-center"
            >
              <Card className="h-full">
                <CardContent className="flex h-full flex-col p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star
                          key={s}
                          className="size-4 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>
                    <Quote className="size-5 text-primary/30" />
                  </div>

                  <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>

                  <div className="mt-4 border-t border-border pt-4">
                    <p className="text-sm font-semibold text-foreground">
                      {t.author}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.projectType}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
