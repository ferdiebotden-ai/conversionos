'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import type { SectionBaseProps } from '@/lib/section-types';

type ServiceItem = {
  name?: string;
  title?: string;
  description?: string;
  image?: string;
  imageUrl?: string;
  icon?: string;
};

const FALLBACK_ICONS: Record<string, string> = {
  flooring: '▦',
  windows: '◫',
};

export function ServicesDetailList({ branding, config, tokens, className }: SectionBaseProps) {
  const [visibleRows, setVisibleRows] = useState<number[]>([]);

  const services = useMemo(() => {
    const rawServices = (config as { services?: ServiceItem[] } | null)?.services;
    if (!Array.isArray(rawServices) || rawServices.length === 0) return [];

    return rawServices.slice(0, 6).map((service) => {
      const name = service.name ?? service.title ?? '';
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const image = service.imageUrl ?? service.image ?? '';

      return {
        name,
        description: service.description ?? '',
        image,
        slug,
        icon: service.icon ?? FALLBACK_ICONS[slug] ?? '✦',
        hasImage: Boolean(image),
      };
    });
  }, [config]);

  useEffect(() => {
    if (services.length === 0) return;

    const observers: IntersectionObserver[] = [];
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-service-row]'));

    elements.forEach((element) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;
          const index = Number(element.dataset['index'] ?? '-1');
          if (index >= 0) {
            setVisibleRows((current) => (current.includes(index) ? current : [...current, index]));
          }
          observer.unobserve(element);
        },
        { threshold: 0.18, rootMargin: '0px 0px -10% 0px' },
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => observers.forEach((observer) => observer.disconnect());
  }, [services.length]);

  if (!branding || services.length === 0 || services.some((service) => !service.name || !service.description)) {
    return null;
  }

  return (
    <section className={`py-20 ${className ?? ''}`} aria-labelledby="services-detail-list-heading">
      <div className="mx-auto max-w-[1700px] px-4 sm:px-6 lg:px-8">
        <header className="sr-only">
          <h2 id="services-detail-list-heading">Detailed renovation services</h2>
          <p>{branding.name} service breakdown with direct estimate links.</p>
        </header>

        <nav aria-label="Detailed service list" className="space-y-16">
          {services.map((service, index) => {
            const isEvenRow = index % 2 === 1;
            const isVisible = visibleRows.includes(index);
            const imagePanel = (
              <div className="relative w-full overflow-hidden rounded-[6px] bg-[oklch(0.98_0_0)]" style={{ backgroundColor: 'var(--base, #f8f8f8)' }}>
                {service.hasImage ? (
                  <div className="relative aspect-[16/11] min-h-[280px] w-full md:min-h-[420px]">
                    <Image
                      src={service.image}
                      alt={service.name}
                      fill
                      className="rounded-[6px] object-cover"
                      sizes="(max-width: 767px) 100vw, 50vw"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[16/11] min-h-[280px] items-center justify-center rounded-[6px] bg-[var(--base,#f8f8f8)] md:min-h-[420px]">
                    <span
                      aria-hidden="true"
                      className="text-6xl leading-none text-[oklch(0.58_0.15_250)]"
                      style={{ color: '#0e79eb' }}
                    >
                      {service.icon}
                    </span>
                    <span className="sr-only">{service.name} placeholder image</span>
                  </div>
                )}
              </div>
            );

            const textPanel = (
              <article className="flex h-full flex-col justify-center">
                <h3
                  className="text-2xl font-bold tracking-normal"
                  style={{
                    color: 'var(--contrast-2, #161616)',
                    fontFamily: 'Raleway, sans-serif',
                    fontSize: '24px',
                    fontWeight: 700,
                    lineHeight: '1.2',
                  }}
                >
                  {service.name}
                </h3>
                <p
                  className="mt-5 text-lg"
                  style={{
                    color: 'var(--contrast-3, #444348)',
                    fontFamily: 'Mulish, sans-serif',
                    fontSize: '18px',
                    fontWeight: 400,
                    lineHeight: '28.8px',
                  }}
                >
                  {service.description}
                </p>
                <div className="mt-8">
                  <Link
                    href={`/visualizer?service=${encodeURIComponent(service.name)}`}
                    className="inline-flex items-center justify-center rounded-[6px] border-2 px-5 py-3 text-[15px] font-medium transition-transform duration-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{
                      borderColor: '#0e79eb',
                      color: '#0e79eb',
                      fontFamily: 'Mulish, sans-serif',
                    }}
                  >
                    Get Your Free Design Estimate
                  </Link>
                </div>
              </article>
            );

            return (
              <div
                key={`${service.slug}-${index}`}
                data-service-row
                data-index={index}
                className={`grid items-stretch gap-8 md:grid-cols-2 md:gap-10 lg:gap-14 ${
                  isVisible
                    ? 'translate-x-0 opacity-100'
                    : isEvenRow
                      ? 'translate-x-12 opacity-0'
                      : '-translate-x-12 opacity-0'
                } transition-all duration-700 ease-out`}
              >
                {isEvenRow ? (
                  <>
                    <div className="order-2 md:order-1">{textPanel}</div>
                    <div className="order-1 md:order-2">{imagePanel}</div>
                  </>
                ) : (
                  <>
                    <div>{imagePanel}</div>
                    <div>{textPanel}</div>
                  </>
                )}
              </div>
            );
          })}
        </nav>

        <footer className="sr-only">
          <p>{branding.name} renovation services with estimate entry points.</p>
        </footer>
      </div>
    </section>
  );
}
