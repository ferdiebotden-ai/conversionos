'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { SectionBaseProps } from '@/lib/section-types';

type ServiceItem = {
  name: string;
  description?: string;
  image_urls?: string[];
};

export function ServicesGrid({ config, className }: SectionBaseProps) {
  const c = (config ?? {}) as Record<string, unknown>;
  const rawServices = (c['services'] ?? []) as ServiceItem[];
  const services = rawServices.filter(s => s?.name);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setIsVisible(true); obs.disconnect(); } }, { threshold: 0.1 });
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  if (services.length === 0) return null;

  return (
    <section ref={ref} className={`bg-[rgb(248,247,245)] py-20 ${className ?? ''}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.15em] text-primary">What We Do</p>
          <h2 className="font-[Anton] text-4xl uppercase text-gray-900 md:text-5xl">Our Services</h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => {
            const img = service.image_urls?.[0];
            return (
              <div
                key={service.name}
                className="group overflow-hidden rounded-lg bg-white shadow-md transition-all duration-500 hover:-translate-y-1 hover:shadow-xl"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                  transition: `opacity 0.6s ease ${i * 0.1}s, transform 0.6s ease ${i * 0.1}s`,
                }}
              >
                {img && (
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image src={img} alt={service.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                  </div>
                )}
                <div className="p-6">
                  <h3 className="mb-2 font-[Anton] text-xl uppercase text-gray-900">{service.name}</h3>
                  {service.description && (
                    <p className="text-sm leading-relaxed text-gray-600">{service.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Link href="/contact" className="inline-flex items-center gap-2 rounded bg-primary px-8 py-3 text-sm font-semibold uppercase tracking-wider text-white transition hover:brightness-110">
            Get a Free Quote
          </Link>
        </div>
      </div>
    </section>
  );
}
