'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { SectionBaseProps } from '@/lib/section-types';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

const createServiceImage = (title: string, primary: string, secondary: string) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg width="900" height="1200" viewBox="0 0 900 1200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${primary}" />
          <stop offset="100%" stop-color="${secondary}" />
        </linearGradient>
      </defs>
      <rect width="900" height="1200" fill="url(#bg)" />
      <rect x="72" y="110" width="756" height="430" rx="26" fill="rgba(255,255,255,0.12)" />
      <rect x="120" y="170" width="220" height="300" rx="18" fill="rgba(255,255,255,0.16)" />
      <rect x="380" y="170" width="380" height="110" rx="18" fill="rgba(255,255,255,0.14)" />
      <rect x="380" y="308" width="300" height="162" rx="18" fill="rgba(255,255,255,0.18)" />
      <path d="M96 720C190 654 320 632 446 650C574 669 676 752 804 742V1200H96V720Z" fill="rgba(255,255,255,0.12)" />
      <rect x="96" y="782" width="708" height="290" rx="24" fill="rgba(39,35,38,0.22)" />
      <text x="104" y="1098" fill="rgba(255,255,255,0.24)" font-size="70" font-family="Inter, Arial, sans-serif" font-weight="600">${title}</text>
    </svg>`,
  )}`;

const services = [
  {
    name: 'Home Renovations',
    slug: 'home-renovations',
    image: createServiceImage('Renovations', '#8C796A', '#272326'),
  },
  {
    name: 'Additions & Extensions',
    slug: 'additions-extensions',
    image: createServiceImage('Additions', '#72383F', '#3A2B30'),
  },
  {
    name: 'Exterior Upgrades',
    slug: 'exterior-upgrades',
    image: createServiceImage('Exterior', '#6B7B86', '#272326'),
  },
] as const;

export function ServicesCardGrid({ branding, config, tokens, className }: SectionBaseProps) {
  void tokens;

  const [isVisible, setIsVisible] = useState(false);
  const configData = asRecord(config) ?? {};

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  const title =
    typeof configData['title'] === 'string' && configData['title'].trim().length > 0
      ? configData['title']
      : 'Construction Services';
  const subtitle =
    typeof configData['subtitle'] === 'string' && configData['subtitle'].trim().length > 0
      ? configData['subtitle']
      : `Explore ${branding.name || 'MD Construction'} services tailored for thoughtful renovations, seamless additions, and elevated curb appeal.`;

  return (
    <section
      className={[
        'bg-white py-[100px]',
        className ?? '',
      ].join(' ')}
      aria-labelledby="services-card-grid-heading"
    >
      <div className="mx-auto w-full max-w-[1400px] px-6 md:px-[90px]">
        <header className="mx-auto max-w-3xl text-center">
          <div className="mx-auto h-1 w-16 rounded-full bg-[oklch(0.74_0.13_80)]" />
          <h2
            id="services-card-grid-heading"
            className="mt-6 font-[Poppins] text-4xl font-semibold tracking-tight text-[oklch(from_var(--dark)_l_c_h)] md:text-[48px]"
          >
            {title}
          </h2>
          <p className="mt-4 font-[Inter] text-base leading-7 text-muted-foreground md:text-lg">
            {subtitle}
          </p>
        </header>

        <nav aria-label="Construction service categories" className="mt-14">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10 xl:grid-cols-3 xl:gap-[40px]">
            {services.map((service, index) => (
              <article
                key={service.slug}
                className={[
                  'group transform-gpu transition-all duration-700 ease-out motion-reduce:transform-none motion-reduce:transition-none',
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
                ].join(' ')}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                <Link
                  href={`/services#${service.slug}`}
                  className="block overflow-hidden rounded-[4px] shadow-[6px_6px_9px_rgba(0,0,0,0.2)] outline-none transition-transform duration-300 focus:ring-2 focus:ring-primary focus:ring-offset-4"
                >
                  <div className="relative aspect-[3/4] overflow-hidden rounded-[4px] bg-primary/10">
                    <Image
                      src={service.image}
                      alt={service.name}
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(39,35,38,0.78)_0%,rgba(39,35,38,0.22)_55%,rgba(39,35,38,0.12)_100%)] transition-opacity duration-300 group-hover:opacity-80" />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6 md:p-7">
                      <h3 className="pr-4 font-[Poppins] text-2xl font-semibold uppercase tracking-[0.08em] text-white md:text-[30px]">
                        {service.name}
                      </h3>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 h-0 bg-[oklch(from_var(--nectar-accent-color)_l_c_h)] transition-all duration-300 group-hover:h-1" />
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </nav>

        <footer className="mt-12 flex justify-center">
          <Link
            href="/visualizer"
            className="inline-flex items-center justify-center rounded-[4px] bg-primary px-6 py-3 font-[Inter] text-lg font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-4"
          >
            Get Your Free Design Estimate
          </Link>
        </footer>
      </div>
    </section>
  );
}
