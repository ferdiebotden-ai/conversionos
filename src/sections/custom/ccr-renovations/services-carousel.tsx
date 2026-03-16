'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import type { SectionBaseProps } from '@/lib/section-types';

type ServiceInput = {
  key?: string;
  slug?: string;
  name?: string;
  title?: string;
  description?: string;
  short_description?: string;
  shortDescription?: string;
  image_urls?: string[];
  imageUrls?: string[];
  image?: string;
  imageUrl?: string;
};

type ServicesCarouselConfig = {
  services?: ServiceInput[];
};

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

export function ServicesCarousel({ branding, config, tokens, className }: SectionBaseProps) {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const sectionConfig = (config ?? {}) as ServicesCarouselConfig;
  const hasTenantContext = Boolean(branding || tokens);
  void hasTenantContext;

  const services = (sectionConfig.services ?? [])
    .map((service) => {
      const imageUrl =
        str((service.image_urls ?? service.imageUrls ?? [])[0]) ??
        str(service.image) ??
        str(service.imageUrl);
      const name = str(service.title) ?? str(service.name);
      const description =
        str(service.description) ??
        str(service.short_description) ??
        str(service.shortDescription);

      if (!imageUrl || !name) return null;

      return { name, imageUrl, description };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setIsVisible(true);
        observer.disconnect();
      },
      { threshold: 0.15 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (!services.length) return null;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="ccr-services-heading"
      className={`bg-[rgb(248,247,245)] py-16 md:py-24 ${className ?? ''}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-14 text-center">
          <h2
            id="ccr-services-heading"
            className="[font-family:Anton,sans-serif] text-4xl uppercase tracking-[0.04em] text-[oklch(0.37_0.06_179)] md:text-5xl"
          >
            Our Services
          </h2>
          <div className="mx-auto mt-4 h-[3px] w-16 bg-[oklch(0.37_0.06_179)]" aria-hidden="true" />
        </header>

        <nav aria-label={`${branding?.name ?? 'CCR Renovations'} services`}>
          <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-3">
            {services.map((service, index) => (
              <Link
                key={service.name}
                href="/services"
                aria-label={`View ${service.name}`}
                className={`group block overflow-hidden focus:outline-none focus:ring-2 focus:ring-[oklch(0.37_0.06_179)] focus:ring-offset-2 transition-all duration-700 ease-out ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`}
                style={{ transitionDelay: `${index * 120}ms` }}
              >
                <article className="relative aspect-[3/4] overflow-hidden bg-[oklch(0.95_0_0)]">
                  <Image
                    src={service.imageUrl}
                    alt={service.name}
                    fill
                    priority={index < 3}
                    sizes="(max-width: 639px) 50vw, (max-width: 1023px) 50vw, 33vw"
                    className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
                  />

                  {/* Default gradient overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0.75)_0%,rgba(0,0,0,0.15)_50%,transparent_100%)] transition-opacity duration-300 group-hover:opacity-90" />

                  {/* Hover: reveal description overlay */}
                  <div className="absolute inset-0 flex flex-col justify-end bg-[oklch(0.37_0.06_179/0.85)] p-5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:p-6">
                    <h3 className="[font-family:Anton,sans-serif] text-lg uppercase tracking-[0.04em] text-white sm:text-xl">
                      {service.name}
                    </h3>
                    {service.description && (
                      <p className="mt-2 line-clamp-3 [font-family:'Open_Sans',sans-serif] text-sm leading-relaxed text-white/90">
                        {service.description}
                      </p>
                    )}
                    <span className="mt-3 inline-flex items-center gap-1 [font-family:'Open_Sans',sans-serif] text-xs font-semibold uppercase tracking-[0.1em] text-white/80">
                      Learn More
                      <svg
                        className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>

                  {/* Default state: name at bottom */}
                  <div className="absolute inset-x-0 bottom-0 p-4 transition-opacity duration-300 group-hover:opacity-0 sm:p-6">
                    <h3 className="[font-family:Anton,sans-serif] text-lg uppercase tracking-[0.04em] text-white sm:text-xl">
                      {service.name}
                    </h3>
                  </div>

                  {/* Lift + shadow on hover */}
                </article>
                <div className="transition-shadow duration-300 group-hover:shadow-[0_8px_30px_rgba(22,74,65,0.25)]" />
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </section>
  );
}
