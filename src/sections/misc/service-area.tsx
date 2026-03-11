'use client';

import { MapPin } from 'lucide-react';
import type { SectionBaseProps } from '@/lib/section-types';

export function MiscServiceArea({ config, className }: SectionBaseProps) {
  if (!config.serviceArea) return null;

  return (
    <section className={`border-t border-border bg-muted/30 px-4 py-12 md:py-16 ${className ?? ''}`}>
      <div className="container mx-auto">
        <div className="mx-auto max-w-2xl text-center">
          <div className="flex items-center justify-center gap-3">
            <MapPin className="size-6 text-primary" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Service Area
            </h2>
          </div>
          <p className="mt-4 text-muted-foreground">
            We proudly serve homeowners and businesses throughout {config.serviceArea}.
          </p>
        </div>
      </div>
    </section>
  );
}
