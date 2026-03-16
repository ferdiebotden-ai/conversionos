'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { SectionBaseProps } from '@/lib/section-types';

type TestimonialItem = {
  quote: string;
  author: string;
  rating?: number;
};

const CYCLE_INTERVAL = 6000;

export function TestimonialBand({ branding, config, tokens, className }: SectionBaseProps) {
  void branding;
  void tokens;

  // Read testimonials from config — support both camelCase and snake_case keys
  const raw = (config as { testimonials?: unknown[]; testimonial_list?: unknown[] })?.testimonials
    ?? (config as { testimonial_list?: unknown[] })?.testimonial_list
    ?? [];

  const testimonials: TestimonialItem[] = Array.isArray(raw)
    ? raw
        .map((t) => {
          const item = t as { quote?: string; text?: string; author?: string; name?: string; rating?: number; star_rating?: number };
          return {
            quote: item.quote ?? item.text ?? '',
            author: item.author ?? item.name ?? '',
            rating: item.rating ?? item.star_rating ?? 5,
          };
        })
        .filter((t): t is { quote: string; author: string; rating: number } => Boolean(t.quote && t.author))
    : [];

  const [activeIndex, setActiveIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback(
    (index: number) => {
      setIsFading(true);
      setTimeout(() => {
        setActiveIndex(index);
        setIsFading(false);
      }, 350);
    },
    [],
  );

  // IntersectionObserver — reveal on scroll
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setIsVisible(true);
        observer.disconnect();
      },
      { threshold: 0.2 },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  // Auto-cycle
  useEffect(() => {
    if (testimonials.length <= 1) return;

    timerRef.current = setInterval(() => {
      goTo((activeIndex + 1) % testimonials.length);
    }, CYCLE_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeIndex, goTo, testimonials.length]);

  if (testimonials.length === 0) return null;

  const testimonial = testimonials[activeIndex];

  if (!testimonial?.quote || !testimonial.author) return null;

  const starCount = Math.max(0, Math.min(5, testimonial.rating ?? 5));

  return (
    <section
      ref={sectionRef}
      aria-labelledby="ccr-testimonial-band-heading"
      className={[
        'relative overflow-hidden bg-primary py-24 text-primary-foreground md:py-32',
        className ?? '',
      ].join(' ')}
    >
      {/* Subtle radial glow overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,oklch(1_0_0_/_0.06)_0%,transparent_70%)]"
      />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div
          className={[
            'mx-auto max-w-4xl text-center transition-all duration-700 ease-out',
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
          ].join(' ')}
        >
          <h2 id="ccr-testimonial-band-heading" className="sr-only">
            Client Testimonials
          </h2>

          {/* Stars */}
          {starCount > 0 ? (
            <div
              className="mb-8 flex items-center justify-center gap-1.5"
              aria-label={`${starCount} out of 5 star rating`}
            >
              {Array.from({ length: starCount }).map((_, index) => (
                <span
                  key={index}
                  aria-hidden="true"
                  className="text-2xl text-[oklch(0.86_0.17_88)]"
                >
                  ★
                </span>
              ))}
            </div>
          ) : null}

          {/* Quote */}
          <div
            className={[
              'transition-opacity duration-350 ease-in-out',
              isFading ? 'opacity-0' : 'opacity-100',
            ].join(' ')}
          >
            <blockquote className="relative mx-auto max-w-[850px]">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 font-serif text-[7rem] leading-none text-[oklch(1_0_0_/_0.15)] md:text-[9rem]"
              >
                &ldquo;
              </span>

              <p
                className="pt-12 font-[Anton,sans-serif] uppercase leading-[1.3] text-primary-foreground"
                style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)' }}
              >
                {testimonial.quote}
              </p>
            </blockquote>

            <footer className="mt-8">
              <p className="font-['Open_Sans',sans-serif] text-base font-medium tracking-wide text-[oklch(1_0_0_/_0.8)]">
                &mdash; {testimonial.author}
              </p>
            </footer>
          </div>

          {/* Dot indicators */}
          {testimonials.length > 1 ? (
            <nav
              aria-label="Testimonial navigation"
              className="mt-10 flex items-center justify-center gap-3"
            >
              {testimonials.map((item, index) => (
                <button
                  key={`${item.author}-${index}`}
                  type="button"
                  aria-label={`Show testimonial ${index + 1}`}
                  aria-pressed={activeIndex === index}
                  onClick={() => goTo(index)}
                  className={[
                    'h-3 w-3 rounded-full border border-[oklch(1_0_0_/_0.4)] transition-all duration-300',
                    'focus:outline-none focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2 focus:ring-offset-primary',
                    activeIndex === index
                      ? 'scale-110 bg-primary-foreground'
                      : 'bg-[oklch(1_0_0_/_0.25)] hover:bg-[oklch(1_0_0_/_0.5)]',
                  ].join(' ')}
                />
              ))}
            </nav>
          ) : null}
        </div>
      </div>
    </section>
  );
}
