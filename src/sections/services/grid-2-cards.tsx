'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { StaggerContainer, StaggerItem } from '@/components/motion';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function ServicesGrid2Cards({ branding, config, className }: Props) {
  if (!config.services || config.services.length === 0) return null;

  return (
    <section className={`py-16 md:py-20 ${className ?? ''}`}>
      <div className="container mx-auto px-4">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            What We Do
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            {branding.name} delivers expert renovation services across {branding.city} and the surrounding region.
          </p>
        </div>

        <StaggerContainer className="grid gap-8 md:grid-cols-2">
          {config.services.map((service) => (
            <StaggerItem key={service.slug}>
              <Link href={`/services/${service.slug}`} className="group block h-full">
                <div
                  data-slot="card"
                  className="h-full overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/20 hover:shadow-lg"
                >
                  {service.imageUrl && (
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <Image
                        src={service.imageUrl}
                        alt={service.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                  )}
                  <div className="p-6 md:p-8">
                    <h3 className="text-xl font-semibold text-foreground">
                      {service.name}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {service.description}
                    </p>
                    {service.features && service.features.length > 0 && (
                      <ul className="mt-4 space-y-1.5">
                        {service.features.slice(0, 4).map((feature) => (
                          <li
                            key={feature}
                            className="flex items-start gap-2 text-sm text-muted-foreground"
                          >
                            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}
                    <span className="mt-5 inline-block text-sm font-medium text-primary">
                      Learn More &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
