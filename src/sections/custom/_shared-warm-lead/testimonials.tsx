'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { SectionBaseProps } from '@/lib/section-types';

type TestimonialItem = {
  quote: string;
  author: string;
  rating: number;
};

const CYCLE_MS = 6000;

function parseTestimonials(c: Record<string, unknown>): TestimonialItem[] {
  const raw = (c['testimonials'] ?? c['testimonial_list'] ?? c['reviews'] ?? []) as unknown[];

  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) => {
      const t = entry as Record<string, unknown>;
      const quote =
        typeof t['quote'] === 'string' ? t['quote'].trim() :
        typeof t['text'] === 'string' ? t['text'].trim() :
        typeof t['content'] === 'string' ? t['content'].trim() : '';
      const author =
        typeof t['author'] === 'string' ? t['author'].trim() :
        typeof t['name'] === 'string' ? t['name'].trim() :
        typeof t['reviewer'] === 'string' ? t['reviewer'].trim() : '';
      const rating = Number(t['rating'] ?? t['star_rating'] ?? t['stars'] ?? 5);

      return { quote, author, rating: Math.max(0, Math.min(5, rating)) };
    })
    .filter((t) => t.quote && t.author);
}

export function WarmLeadTestimonials({ config, className }: SectionBaseProps) {
  const c = (config ?? {}) as Record<string, unknown>;
  const testimonials = parseTestimonials(c);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback((index: number) => {
    setIsFading(true);
    setTimeout(() => {
      setActiveIndex(index);
      setIsFading(false);
    }, 350);
  }, []);

  // Scroll reveal
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        requestAnimationFrame(() => setIsVisible(true));
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
    }, CYCLE_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeIndex, goTo, testimonials.length]);

  if (testimonials.length === 0) return null;

  const testimonial = testimonials[activeIndex];
  if (!testimonial) return null;

  const starCount = testimonial.rating;

  return (
    <section
      ref={sectionRef}
      className={[
        'relative overflow-hidden bg-primary py-24 text-primary-foreground md:py-32',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-labelledby="wl-testimonials-heading"
    >
      {/* Subtle radial glow */}
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
          <h2 id="wl-testimonials-heading" className="sr-only">
            Client Testimonials
          </h2>

          {/* Stars */}
          {starCount > 0 && (
            <div
              className="mb-8 flex items-center justify-center gap-1.5"
              aria-label={`${starCount} out of 5 star rating`}
            >
              {Array.from({ length: starCount }).map((_, i) => (
                <span key={i} aria-hidden="true" className="text-2xl text-amber-400">
                  &#9733;
                </span>
              ))}
            </div>
          )}

          {/* Quote */}
          <div
            className={[
              'transition-opacity duration-350 ease-in-out',
              isFading ? 'opacity-0' : 'opacity-100',
            ].join(' ')}
          >
            <blockquote className="relative mx-auto max-w-[850px]">
              {/* Decorative quote mark */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 font-serif text-[7rem] leading-none text-primary-foreground/15 md:text-[9rem]"
              >
                &ldquo;
              </span>

              <p
                className="pt-12 font-heading uppercase leading-[1.3] text-primary-foreground"
                style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)' }}
              >
                {testimonial.quote}
              </p>
            </blockquote>

            <footer className="mt-8">
              <p className="font-body text-base font-medium tracking-wide text-primary-foreground/80">
                &mdash; {testimonial.author}
              </p>
            </footer>
          </div>

          {/* Dot navigation */}
          {testimonials.length > 1 && (
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
                    'h-3 w-3 rounded-full border border-primary-foreground/40 transition-all duration-300',
                    'focus:outline-none focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2 focus:ring-offset-primary',
                    activeIndex === index
                      ? 'scale-110 bg-primary-foreground'
                      : 'bg-primary-foreground/25 hover:bg-primary-foreground/50',
                  ].join(' ')}
                />
              ))}
            </nav>
          )}
        </div>
      </div>
    </section>
  );
}
