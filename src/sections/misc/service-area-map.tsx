'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { FadeInUp } from '@/components/motion';
import { MapPin } from 'lucide-react';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

function parseCities(serviceArea: string): string[] {
  if (!serviceArea) return [];
  // Split on commas, ampersands, " and ", or dashes for lists
  const parts = serviceArea
    .split(/[,&]|\band\b|\b[-]\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 60);
  return parts.length > 1 ? parts : [];
}

export function MiscServiceAreaMap({ branding, config, className }: Props) {
  if (!config.serviceArea && !branding.city) return null;

  const cities = parseCities(config.serviceArea);

  return (
    <section className={`py-12 md:py-20 ${className ?? ''}`}>
      <div className="mx-auto max-w-4xl px-4">
        <FadeInUp>
          <div className="rounded-2xl bg-muted/30 p-8 md:p-12">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="size-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                  Our Service Area
                </h2>
                <p className="mt-2 text-lg text-muted-foreground">
                  Proudly serving {config.serviceArea || branding.city}
                </p>
              </div>
            </div>

            {branding.city && (
              <div className="mt-6 flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                <span className="font-medium">
                  Based in {branding.city}, {branding.province}
                </span>
              </div>
            )}

            {cities.length > 1 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Areas We Cover
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {cities.map((city) => (
                    <span
                      key={city}
                      className="rounded-full bg-background px-4 py-1.5 text-sm font-medium shadow-sm"
                    >
                      {city}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
