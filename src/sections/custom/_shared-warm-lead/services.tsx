'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import type { SectionBaseProps } from '@/lib/section-types';

type ServiceItem = {
  name: string;
  description?: string;
  image_urls?: string[];
  imageUrls?: string[];
};

function resolveServiceImage(service: ServiceItem): string | undefined {
  const urls = service.image_urls ?? service.imageUrls;
  const first = urls?.[0];
  return typeof first === 'string' && first.trim() ? first.trim() : undefined;
}

export function WarmLeadServices({ config, className }: SectionBaseProps) {
  const c = (config ?? {}) as Record<string, unknown>;
  const rawServices = (c['services'] ?? []) as ServiceItem[];
  const services = rawServices.filter((s) => s?.name);

  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        requestAnimationFrame(() => setIsVisible(true));
        observer.disconnect();
      },
      { threshold: 0.1 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (services.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className={['bg-[rgb(248,247,245)] py-20 md:py-28', className].filter(Boolean).join(' ')}
      aria-labelledby="wl-services-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mx-auto mb-14 max-w-3xl text-center">
          <p className="mb-3 font-body text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            What We Do
          </p>
          <h2
            id="wl-services-heading"
            className="font-heading text-4xl uppercase leading-tight tracking-wide text-foreground md:text-5xl"
          >
            Our Services
          </h2>
        </header>

        {/* Grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => {
            const img = resolveServiceImage(service);

            return (
              <article
                key={`${service.name}-${i}`}
                className="group overflow-hidden rounded-lg bg-white shadow-md transition-all duration-500 hover:-translate-y-1 hover:shadow-xl"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
                  transition: `opacity 0.6s ease ${i * 0.1}s, transform 0.6s ease ${i * 0.1}s`,
                }}
              >
                {/* Image */}
                {img ? (
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={img}
                      alt={service.name}
                      fill
                      loading="lazy"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Hover overlay with description */}
                    {service.description && (
                      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-5 opacity-0 transition-opacity duration-400 group-hover:opacity-100">
                        <p className="font-body text-sm leading-relaxed text-white">
                          {service.description}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Placeholder when no image */
                  <div className="flex aspect-[4/3] items-center justify-center bg-muted">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      className="h-12 w-12 text-muted-foreground/30"
                      aria-hidden="true"
                    >
                      <rect x="2" y="2" width="20" height="20" rx="2" />
                      <path d="M7 10l3-3 4 4 3-3 3 3" />
                    </svg>
                  </div>
                )}

                {/* Text */}
                <div className="p-6">
                  <h3 className="mb-2 font-heading text-xl uppercase text-foreground">
                    {service.name}
                  </h3>
                  {service.description && !img && (
                    <p className="font-body text-sm leading-relaxed text-muted-foreground">
                      {service.description}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {/* CTA */}
        <footer className="mt-14 flex justify-center">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-8 py-3.5 font-body text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-all duration-200 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            View All Services
          </Link>
        </footer>
      </div>
    </section>
  );
}
