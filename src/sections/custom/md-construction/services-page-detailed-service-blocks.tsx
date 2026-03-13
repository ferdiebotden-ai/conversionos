'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import type { SectionBaseProps } from '@/lib/section-types';

const makeServiceImage = (title: string, subtitle: string, accent: string) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 980"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${accent}"/><stop offset="100%" stop-color="#272326"/></linearGradient></defs><rect width="1400" height="980" fill="url(#bg)"/><rect x="76" y="72" width="1248" height="836" rx="20" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.18)"/><rect x="120" y="136" width="360" height="220" rx="18" fill="rgba(255,255,255,0.16)"/><rect x="520" y="136" width="220" height="360" rx="18" fill="rgba(255,255,255,0.12)"/><rect x="780" y="136" width="500" height="280" rx="18" fill="rgba(255,255,255,0.14)"/><rect x="120" y="400" width="560" height="180" rx="18" fill="rgba(255,255,255,0.12)"/><rect x="720" y="456" width="560" height="124" rx="18" fill="rgba(255,255,255,0.10)"/><text x="120" y="760" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="88" font-weight="600">${title}</text><text x="120" y="836" fill="rgba(255,255,255,0.82)" font-family="Inter, Arial, sans-serif" font-size="34">${subtitle}</text></svg>`
  )}`;

const services = [
  {
    title: 'Home Renovations',
    description:
      'Rework dated interiors into cohesive, comfortable spaces with renovation planning, disciplined project management, and craftsmanship that improves how your home feels and functions every day.',
    features: [
      'Kitchen, bathroom, basement, and whole-home transformations',
      'Layout refinements that improve flow, storage, and usability',
      'Material and finish direction aligned with budget and style goals',
      'Clean job sites, clear communication, and detail-driven finishing',
    ],
    image: makeServiceImage('Home Renovations', 'Interiors reimagined with modern flow and finish.', '#f6c102'),
    faq: [
      ['What renovation projects are the best fit?', 'This service is ideal for kitchens, bathrooms, basements, main floors, and full interior remodels where better function and updated finishes matter most.'],
      ['Can the scope be refined before the build starts?', 'Yes. Planning support helps confirm priorities, sequence trade work properly, and keep the project aligned with the investment you want to make.'],
    ],
  },
  {
    title: 'Additions & Extensions',
    description:
      'Add meaningful square footage with seamless additions and extensions designed to connect naturally with the existing home while improving comfort, flexibility, and long-term value.',
    features: [
      'Rear, side, and second-storey addition construction',
      'Integrated structural planning and cohesive roofline transitions',
      'New bedrooms, offices, family rooms, and expanded living zones',
      'Built to feel intentional from both the inside and the curb',
    ],
    image: makeServiceImage('Additions & Extensions', 'Smart expansion that feels built-in, not bolted on.', '#d8a217'),
    faq: [
      ['How do you make an addition feel cohesive?', 'Matching massing, materials, transitions, and interior circulation helps the new space blend naturally with the home you already have.'],
      ['Is adding on better than moving?', 'For many homeowners, yes. An addition can deliver the space you need without leaving a neighbourhood, lot, or home base you already love.'],
    ],
  },
  {
    title: 'Exterior Upgrades',
    description:
      'Improve curb appeal and exterior performance with upgrades that strengthen durability, refresh the look of the property, and create a more polished first impression from every angle.',
    features: [
      'Siding, trim, entrances, and exterior finishing improvements',
      'Porches, decks, and outdoor living space enhancements',
      'Weather-conscious materials chosen for resilience and appearance',
      'Careful exterior detailing that elevates the entire property',
    ],
    image: makeServiceImage('Exterior Upgrades', 'Sharper curb appeal with durable exterior detailing.', '#b88912'),
    faq: [
      ['Which upgrades have the biggest visual impact?', 'Siding refreshes, upgraded trim, improved entrances, and refined outdoor living features usually create the most noticeable transformation.'],
      ['Do exterior upgrades also protect the home?', 'Absolutely. Better materials and installation details help defend against weather, wear, and moisture while improving appearance at the same time.'],
    ],
  },
] as const;

type Service = (typeof services)[number];

function ServiceBlock({ service, reverse, businessName }: { service: Service; reverse: boolean; businessName: string }) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return void setVisible(true);
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setVisible(true);
      observer.disconnect();
    }, { threshold: 0.2 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const imageOrder = reverse ? 'order-1 md:order-2' : 'order-1';
  const textOrder = reverse ? 'order-2 md:order-1' : 'order-2';

  return (
    <article
      id={service.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
      ref={ref}
      className={`grid gap-8 transition-all duration-700 ease-out md:grid-cols-2 md:gap-10 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
    >
      <div className={`relative min-h-[300px] overflow-hidden rounded-[4px] md:min-h-[520px] ${imageOrder}`}>
        <Image src={service.image} alt={`${service.title} by ${businessName}`} fill className="object-cover" sizes="(max-width: 767px) 100vw, 50vw" />
      </div>
      <div className={`flex flex-col justify-center ${textOrder}`}>
        <span className="mb-6 h-1 w-16 rounded-full bg-[oklch(0.86_0.18_95)]" />
        <h2 className="font-[Poppins] text-[32px] font-semibold leading-tight text-[oklch(0.27_0.02_10)] md:text-[36px]">{service.title}</h2>
        <p className="mt-5 max-w-xl font-[Inter] text-[15px] leading-[25px] text-muted-foreground">{service.description}</p>
        <ul className="mt-6 space-y-3 font-[Inter] text-[15px] leading-[25px] text-[oklch(0.27_0.02_10)]">
          {service.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[10px] h-2 w-2 shrink-0 rounded-full bg-[oklch(0.42_0.08_14)]" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <Link
          href={`/visualizer?service=${encodeURIComponent(service.title)}`}
          className="mt-8 inline-flex w-fit items-center justify-center rounded-[4px] border border-primary px-6 py-3 font-[Inter] text-[18px] font-semibold leading-[26px] text-primary transition hover:bg-primary hover:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          Get Your Free Design Estimate
        </Link>
        <div className="mt-8 rounded-[4px] border border-black/10 bg-white">
          {service.faq.map(([question, answer]) => (
            <details key={question} className="group border-b border-black/10 last:border-b-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-0 py-6 text-left outline-none marker:content-none focus:ring-2 focus:ring-primary">
                <h4 className="font-[Poppins] text-xl font-semibold text-[oklch(0.27_0.02_10)]">{question}</h4>
                <span className="text-primary transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="pb-6 font-[Inter] text-[15px] leading-[25px] text-muted-foreground">{answer}</div>
            </details>
          ))}
        </div>
      </div>
    </article>
  );
}

export function ServicesPageDetailedServiceBlocks({ branding, config, tokens, className }: SectionBaseProps) {
  if (!branding || !config) return null;

  const businessName = branding.name ?? 'MD Construction';
  void tokens;

  return (
    <section className={`bg-white py-12 md:py-20 ${className ?? ''}`}>
      <nav className="sr-only" aria-label="Detailed service navigation">
        {services.map((service) => (
          <Link key={service.title} href={`#${service.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>{service.title}</Link>
        ))}
      </nav>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-20 px-4 md:px-8 lg:px-[90px]">
        {services.map((service, index) => (
          <ServiceBlock key={service.title} service={service} reverse={index % 2 === 1} businessName={businessName} />
        ))}
      </div>
      <footer className="sr-only">Detailed services section for {businessName}</footer>
    </section>
  );
}
