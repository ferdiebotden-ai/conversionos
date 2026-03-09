'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { StaggerContainer, StaggerItem } from '@/components/motion';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function ServicesBento({ branding, config, className }: Props) {
  if (!config.services || config.services.length === 0) return null;

  const featured = config.services[0];
  const rest = config.services.slice(1);

  if (!featured) return null;

  return (
    <section className={`py-16 md:py-20 ${className ?? ''}`}>
      <div className="container mx-auto px-4">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Our Services
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            See what {branding.name} can build for you.
          </p>
        </div>

        <StaggerContainer className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {/* Featured first service — large card */}
          <StaggerItem className="col-span-2">
            <Link href={`/services/${featured.slug}`} className="group block h-full">
              <div
                data-slot="card"
                className="relative h-full min-h-[260px] overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/20 hover:shadow-lg md:min-h-[320px]"
              >
                {featured.imageUrl && (
                  <Image
                    src={featured.imageUrl}
                    alt={featured.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 66vw"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6">
                  <h3 className="text-xl font-bold text-white md:text-2xl">
                    {featured.name}
                  </h3>
                  <p className="mt-1 max-w-md text-sm text-white/80">
                    {featured.description}
                  </p>
                </div>
              </div>
            </Link>
          </StaggerItem>

          {/* Remaining services — standard cards */}
          {rest.map((service) => (
            <StaggerItem key={service.slug}>
              <Link href={`/services/${service.slug}`} className="group block h-full">
                <div
                  data-slot="card"
                  className="relative flex h-full min-h-[200px] flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/20 hover:shadow-lg"
                >
                  {service.imageUrl ? (
                    <>
                      <div className="relative flex-1">
                        <Image
                          src={service.imageUrl}
                          alt={service.name}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 768px) 50vw, 33vw"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-semibold text-foreground md:text-base">
                          {service.name}
                        </h3>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-1 flex-col justify-end bg-muted/30 p-5">
                      <h3 className="text-base font-semibold text-foreground">
                        {service.name}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {service.description}
                      </p>
                    </div>
                  )}
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
