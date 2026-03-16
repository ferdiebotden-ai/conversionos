'use client';

import { useEffect, useRef, useState } from 'react';

import type { SectionBaseProps } from '@/lib/section-types';

type WhyItem = {
  title?: string;
  description?: string;
  name?: string;
  text?: string;
};

const ICON_CYCLE = ['shield', 'star', 'check'] as const;
type IconName = (typeof ICON_CYCLE)[number];

function ReasonIcon({ icon }: { icon: IconName }) {
  const cls = 'h-10 w-10 text-primary';

  if (icon === 'shield') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cls}
        aria-hidden="true"
      >
        <path d="M12 3l7 3v5c0 4.5-2.9 8.6-7 10-4.1-1.4-7-5.5-7-10V6l7-3Z" />
        <path d="m9.5 12 1.8 1.8 3.7-4" />
      </svg>
    );
  }

  if (icon === 'star') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cls}
        aria-hidden="true"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    );
  }

  // check
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cls}
      aria-hidden="true"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export function WarmLeadWhyUs({ branding, config, className }: SectionBaseProps) {
  const c = (config ?? {}) as Record<string, unknown>;

  const rawWhyChoose = (c['why_choose_us'] ?? c['whyChooseUs'] ?? []) as WhyItem[];
  const rawValues = (c['values'] ?? c['core_values'] ?? c['coreValues'] ?? []) as WhyItem[];

  // Prefer why_choose_us, fall back to values
  const sourceItems = rawWhyChoose.length > 0 ? rawWhyChoose : rawValues;
  const items = sourceItems.filter(
    (item) => (item.title ?? item.name) && (item.description ?? item.text),
  );

  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        requestAnimationFrame(() => setIsVisible(true));
        observer.disconnect();
      },
      { threshold: 0.1 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (items.length === 0) return null;

  const companyName = branding?.name?.trim() || 'Us';

  return (
    <section
      ref={sectionRef}
      className={['py-20 md:py-28', className].filter(Boolean).join(' ')}
      aria-labelledby="wl-whyus-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mx-auto mb-14 max-w-3xl text-center">
          <p className="mb-3 font-body text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Why Choose {companyName}
          </p>
          <h2
            id="wl-whyus-heading"
            className="font-heading text-4xl uppercase leading-tight tracking-wide text-foreground md:text-5xl"
          >
            The Difference
          </h2>
        </header>

        {/* Cards */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => {
            const title = item.title ?? item.name ?? '';
            const desc = item.description ?? item.text ?? '';
            const icon = ICON_CYCLE[i % ICON_CYCLE.length] as IconName;

            return (
              <div
                key={`${title}-${i}`}
                className="flex flex-col items-center rounded-lg bg-card p-8 text-center shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-lg"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
                  transition: `opacity 0.6s ease ${i * 0.12}s, transform 0.6s ease ${i * 0.12}s`,
                }}
              >
                {/* Icon */}
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <ReasonIcon icon={icon} />
                </div>

                {/* Title */}
                <h3 className="mb-3 font-heading text-xl uppercase text-foreground">
                  {title}
                </h3>

                {/* Description */}
                <p className="font-body text-sm leading-relaxed text-muted-foreground">
                  {desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
