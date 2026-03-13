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
  href?: string;
  image?: string;
  imageUrl?: string;
  hasImages?: boolean;
};

type ServicesGridConfig = {
  services?: ServiceInput[];
};

const serviceBlueprints = [
  {
    id: 'bathroom',
    name: 'Bathroom Renovations',
    href: '/services#bathroom-renovations',
    matchTerms: ['bathroom'],
  },
  {
    id: 'kitchen',
    name: 'Kitchen Renovations',
    href: '/services#kitchen-renovations',
    matchTerms: ['kitchen'],
  },
  {
    id: 'basement',
    name: 'Basement Renovations',
    href: '/services#basement-renovations',
    matchTerms: ['basement'],
  },
  {
    id: 'home-renovation',
    name: 'Home Renovations',
    href: '/services#home-renovations',
    matchTerms: ['home renovation', 'home-renovation', 'whole home'],
  },
] as const;

export function ServicesGrid({ branding, config, tokens, className }: SectionBaseProps) {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const sectionConfig = (config ?? {}) as ServicesGridConfig;
  const hasTenantContext = Boolean(branding || tokens);

  const serviceCards = serviceBlueprints
    .map((blueprint) => {
      const match = (sectionConfig.services ?? []).find((service) => {
        const searchable = [service.key, service.slug, service.name, service.title]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return blueprint.matchTerms.some((term) => searchable.includes(term));
      });

      const image = match?.image ?? match?.imageUrl ?? '';
      const href = match?.href ?? blueprint.href;
      const hasImages = match?.hasImages ?? Boolean(image);

      return {
        href,
        image,
        name: match?.title ?? match?.name ?? blueprint.name,
        hasImages,
      };
    })
    .filter((service) => service.hasImages && service.image);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setIsVisible(true);
        observer.disconnect();
      },
      { threshold: 0.2 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (!serviceCards.length) return null;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="westmount-craftsmen-services-heading"
      data-context={hasTenantContext ? 'configured' : 'default'}
      className={`bg-[oklch(1_0_0)] py-12 md:py-16 lg:py-20 ${className ?? ''}`}
    >
      <div className="mx-auto max-w-[1700px] px-4 sm:px-6 lg:px-8">
        <header className="mb-12 text-center">
          <h2
            id="westmount-craftsmen-services-heading"
            className="font-[Raleway,sans-serif] text-2xl font-bold text-[oklch(var(--contrast-2,0.182_0_0))]"
          >
            Our Services
          </h2>
        </header>

        <nav aria-label="Our renovation services">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {serviceCards.map((service, index) => (
              <Link
                key={service.name}
                href={service.href}
                aria-label={`View ${service.name}`}
                className={`group block overflow-hidden rounded-[6px] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-700 ease-out ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <article className="relative aspect-[4/5] overflow-hidden rounded-[6px] bg-[oklch(0.97_0_0)]">
                  <Image
                    src={service.image}
                    alt={service.name}
                    fill
                    priority={index === 0}
                    sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
                    className="object-cover object-center transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0.7)_0%,transparent_60%)] transition-opacity duration-300 ease-out group-hover:opacity-85" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <h3 className="font-[Raleway,sans-serif] text-xl font-bold text-white">
                      {service.name}
                    </h3>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </nav>

        <footer className="mt-10 text-center">
          <Link
            href="/visualizer"
            className="inline-flex items-center justify-center rounded-[6px] bg-primary px-6 py-3 font-[Mulish,sans-serif] text-[15px] font-medium text-primary-foreground transition-colors duration-300 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Get Your Free Design Estimate
          </Link>
        </footer>
      </div>
    </section>
  );
}
