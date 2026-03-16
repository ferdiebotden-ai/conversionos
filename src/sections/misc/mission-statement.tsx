'use client';

import type { SectionBaseProps } from '@/lib/section-types';

export function MiscMissionStatement({ config, className }: SectionBaseProps) {
  const c = (config ?? {}) as Record<string, unknown>;
  const mission = typeof c['mission'] === 'string' ? c['mission'] : null;
  if (!mission) return null;

  return (
    <section className={`border-y border-border bg-primary px-4 py-12 md:py-16 ${className ?? ''}`}>
      <div className="container mx-auto text-center">
        <h2 className="text-2xl font-bold tracking-tight text-primary-foreground sm:text-3xl">
          Our Mission
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/90">
          {mission}
        </p>
      </div>
    </section>
  );
}
