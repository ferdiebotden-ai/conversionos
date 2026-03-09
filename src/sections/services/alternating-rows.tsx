'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { FadeInUp } from '@/components/motion';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function ServicesAlternatingRows({ branding, config, className }: Props) {
  if (!config.services || config.services.length === 0) return null;

  return (
    <section className={`py-16 md:py-20 ${className ?? ''}`}>
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Our Services
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Discover how {branding.name} can transform your home with expert craftsmanship.
          </p>
        </div>

        <div className="space-y-12 md:space-y-16">
          {config.services.map((service, i) => {
            const imageFirst = i % 2 === 0;
            return (
              <FadeInUp key={service.slug}>
                <div className="grid items-center gap-6 md:grid-cols-2 md:gap-10">
                  {/* Image */}
                  <div className={`${imageFirst ? '' : 'md:order-2'}`}>
                    {service.imageUrl ? (
                      <div className="relative aspect-[16/9] overflow-hidden rounded-xl">
                        <Image
                          src={service.imageUrl}
                          alt={service.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-[16/9] items-center justify-center rounded-xl bg-muted/40">
                        <span className="text-4xl text-muted-foreground/40">
                          {service.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Text */}
                  <div className={`${imageFirst ? '' : 'md:order-1'}`}>
                    <h3 className="text-2xl font-bold text-foreground">
                      {service.name}
                    </h3>
                    <p className="mt-3 leading-relaxed text-muted-foreground">
                      {service.description}
                    </p>
                    {service.features && service.features.length > 0 && (
                      <ul className="mt-4 space-y-1.5">
                        {service.features.slice(0, 4).map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link
                      href={`/services/${service.slug}`}
                      className="mt-5 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Learn More
                    </Link>
                  </div>
                </div>
              </FadeInUp>
            );
          })}
        </div>
      </div>
    </section>
  );
}
