'use client';

import { useEffect, useRef, useState } from 'react';

import type { SectionBaseProps } from '@/lib/section-types';

type ProcessStep = {
  title?: string;
  name?: string;
  description?: string;
  text?: string;
  details?: string;
};

function parseProcessSteps(c: Record<string, unknown>): ProcessStep[] {
  const raw =
    c['process_steps'] ??
    c['processSteps'] ??
    c['process'] ??
    c['how_it_works'] ??
    c['howItWorks'] ??
    [];

  if (!Array.isArray(raw)) return [];

  return raw.filter((step) => {
    if (typeof step !== 'object' || step === null) return false;
    const s = step as ProcessStep;
    return (s.title ?? s.name) && (s.description ?? s.text ?? s.details);
  }) as ProcessStep[];
}

export function WarmLeadProcess({ config, className }: SectionBaseProps) {
  const c = (config ?? {}) as Record<string, unknown>;
  const steps = parseProcessSteps(c);

  const sectionRef = useRef<HTMLElement>(null);
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;

        steps.forEach((_, index) => {
          setTimeout(
            () => requestAnimationFrame(() => setRevealedCount((prev) => Math.max(prev, index + 1))),
            index * 200,
          );
        });

        observer.disconnect();
      },
      { threshold: 0.1 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [steps]);

  if (steps.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className={['py-20 md:py-28', className].filter(Boolean).join(' ')}
      aria-labelledby="wl-process-heading"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mx-auto mb-16 max-w-3xl text-center">
          <p className="mb-3 font-body text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            How It Works
          </p>
          <h2
            id="wl-process-heading"
            className="font-heading text-4xl uppercase leading-tight tracking-wide text-foreground md:text-5xl"
          >
            Our Process
          </h2>
        </header>

        {/* Steps */}
        <div className="relative">
          {/* Connecting vertical line (desktop only) */}
          <div
            className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-border lg:block"
            aria-hidden="true"
          />

          <ol className="space-y-12 lg:space-y-16">
            {steps.map((step, index) => {
              const title = step.title ?? step.name ?? '';
              const desc = step.description ?? step.text ?? step.details ?? '';
              const isEven = index % 2 === 0;
              const isRevealed = index < revealedCount;

              return (
                <li
                  key={`${title}-${index}`}
                  className={[
                    'relative transition-all duration-700 ease-out',
                    isRevealed ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:gap-12',
                      isEven ? '' : 'lg:flex-row-reverse',
                    ].join(' ')}
                  >
                    {/* Text block */}
                    <div
                      className={[
                        'flex-1',
                        isEven ? 'lg:text-right' : 'lg:text-left',
                      ].join(' ')}
                    >
                      <h3 className="font-heading text-2xl uppercase tracking-wide text-foreground">
                        {title}
                      </h3>
                      <p className="mt-3 font-body text-base leading-relaxed text-muted-foreground">
                        {desc}
                      </p>
                    </div>

                    {/* Number badge (centered on the line) */}
                    <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg lg:mx-0">
                      <span className="font-heading text-xl font-bold">{index + 1}</span>
                    </div>

                    {/* Spacer for the other side */}
                    <div className="hidden flex-1 lg:block" />
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
