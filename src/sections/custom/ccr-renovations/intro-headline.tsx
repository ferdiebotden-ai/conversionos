'use client';

import type { SectionBaseProps } from '@/lib/section-types';

function s(v: unknown): string { return typeof v === 'string' && v.trim() ? v.trim() : ''; }

export function IntroHeadline({ config, className }: SectionBaseProps) {
  const c = (config ?? {}) as Record<string, unknown>;
  const eyebrow = s(c['eyebrow']) || s(c['introEyebrow']) || 'DURHAM HOME RENOVATIONS';
  const headline = s(c['heroHeadline']) || s(c['hero_headline']) || 'Specialists in All Aspects of Durham Home Renovations and Remodeling';
  const subtitle = s(c['mission']) || s(c['introSubtitle']) || null;

  return (
    <section
      className={`w-full py-20 md:py-28 ${className ?? ''}`}
      style={{
        ['--ccr-green' as string]: 'oklch(0.35 0.08 160)',
        backgroundColor: 'oklch(0.97 0.005 90)',
      }}
    >
      <div className="mx-auto max-w-4xl px-6 text-center">
        {/* Eyebrow */}
        <p
          className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] md:text-sm"
          style={{
            fontFamily: "'Open Sans', sans-serif",
            color: '#164A41',
          }}
        >
          {eyebrow}
        </p>

        {/* Headline */}
        <h2
          className="mb-6 text-3xl font-bold uppercase leading-tight tracking-wide md:text-4xl lg:text-5xl"
          style={{
            fontFamily: "'Anton', sans-serif",
            color: 'oklch(0.20 0.02 160)',
          }}
        >
          {headline}
        </h2>

        {/* Subtitle / Mission */}
        {subtitle && (
          <p
            className="mx-auto max-w-3xl text-base leading-relaxed text-gray-600 md:text-lg"
            style={{ fontFamily: "'Open Sans', sans-serif" }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
