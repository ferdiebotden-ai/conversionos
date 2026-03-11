'use client';

import { useEffect, useRef, useState } from 'react';

import type { SectionBaseProps } from '@/lib/section-types';

type TestimonialItem = {
  quote: string;
  author: string;
  rating?: number;
};

export function TestimonialSection({ branding, config, tokens, className }: SectionBaseProps) {
  void branding;
  void tokens;

  // Read testimonials from config (admin_settings company_profile)
  const rawTestimonials = (config as { testimonials?: { author?: string; quote?: string; rating?: number }[] })?.testimonials;
  const testimonials: TestimonialItem[] = Array.isArray(rawTestimonials)
    ? rawTestimonials.filter((t): t is TestimonialItem => Boolean(t?.quote && t?.author))
    : [];

  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);

  if (testimonials.length === 0) return null;

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setIsVisible(true);
        observer.disconnect();
      },
      { threshold: 0.2 }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const testimonial = testimonials[activeIndex];

  if (!testimonial?.quote || !testimonial.author) return null;

  const rating = Math.max(0, Math.min(5, testimonial.rating ?? 0));

  return (
    <section
      ref={sectionRef}
      aria-labelledby="testimonial-section-heading"
      className={[
        'relative overflow-hidden bg-primary py-20 text-primary-foreground',
        className ?? '',
      ].join(' ')}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,oklch(1_0_0_/_0.08)_0%,oklch(1_0_0_/_0.02)_34%,transparent_72%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-60 [background-image:linear-gradient(oklch(1_0_0_/_0.035)_1px,transparent_1px),linear-gradient(90deg,oklch(1_0_0_/_0.035)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(circle_at_center,black_34%,transparent_86%)]"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div
          className={[
            'mx-auto max-w-4xl text-center transition-all duration-700 ease-out',
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
          ].join(' ')}
        >
          <h2 id="testimonial-section-heading" className="sr-only">
            Client testimonial
          </h2>

          {rating > 0 ? (
            <div
              className="mb-6 flex items-center justify-center gap-1"
              aria-label={`${rating} out of 5 star rating`}
            >
              {Array.from({ length: rating }).map((_, index) => (
                <span key={index} aria-hidden="true" className="text-lg text-[oklch(0.86_0.17_88)]">
                  ★
                </span>
              ))}
            </div>
          ) : null}

          <article className="relative mx-auto max-w-[800px]">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 font-serif text-[6rem] leading-none text-[oklch(1_0_0_/_0.2)] md:text-[7.5rem]"
            >
              “
            </span>

            <blockquote className="pt-10">
              <p className="font-[Mulish,sans-serif] text-[1.125rem] font-normal italic leading-8 text-primary-foreground md:text-[1.25rem]">
                {testimonial.quote}
              </p>
            </blockquote>

            <footer className="mt-6">
              <p className="font-[Raleway,sans-serif] text-base font-bold text-primary-foreground">
                {testimonial.author}
              </p>
            </footer>
          </article>

          {testimonials.length > 1 ? (
            <nav aria-label="Testimonial navigation" className="mt-8 flex items-center justify-center gap-3">
              {testimonials.map((item, index) => (
                <button
                  key={`${item.author}-${index}`}
                  type="button"
                  aria-label={`Show testimonial ${index + 1}`}
                  aria-pressed={activeIndex === index}
                  onClick={() => setActiveIndex(index)}
                  className={[
                    'h-3 w-3 rounded-full border border-[oklch(1_0_0_/_0.45)] transition-colors duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-primary',
                    activeIndex === index ? 'bg-primary-foreground' : 'bg-[oklch(1_0_0_/_0.28)]',
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
