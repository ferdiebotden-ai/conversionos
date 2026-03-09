'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { FadeInUp } from '@/components/motion';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function ServicesAccordionList({ branding, config, className }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!config.services || config.services.length === 0) return null;

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <section className={`py-16 md:py-20 ${className ?? ''}`}>
      <div className="container mx-auto max-w-3xl px-4">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Our Services
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Tap a service to learn more about what {branding.name} can do for your home.
          </p>
        </div>

        <FadeInUp>
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {config.services.map((service, i) => {
              const isOpen = openIndex === i;
              return (
                <div key={service.slug}>
                  <button
                    type="button"
                    onClick={() => toggle(i)}
                    className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-muted/40"
                    aria-expanded={isOpen}
                  >
                    <h3 className="text-base font-semibold text-foreground md:text-lg">
                      {service.name}
                    </h3>
                    <ChevronDown
                      className={`size-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6">
                      {service.imageUrl && (
                        <div className="relative mb-4 aspect-[16/9] overflow-hidden rounded-lg">
                          <Image
                            src={service.imageUrl}
                            alt={service.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 640px"
                          />
                        </div>
                      )}
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {service.description}
                      </p>
                      <Link
                        href={`/services/${service.slug}`}
                        className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
                      >
                        View full details &rarr;
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
