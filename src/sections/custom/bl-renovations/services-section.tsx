'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { SectionBaseProps } from '@/lib/section-types';
import { StaggerContainer, StaggerItem } from '@/components/motion';

type ServiceItem = {
  title: string;
  description: string;
  image: string;
};

function str(v: unknown): string {
  return typeof v === 'string' && v.trim() ? v.trim() : '';
}

function asServiceItem(value: unknown): ServiceItem | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const title = str(item['title']) || str(item['name']) || str(item['service']);
  if (!title) return null;
  return {
    title,
    description:
      str(item['description']) ||
      str(item['copy']) ||
      str(item['summary']) ||
      'Crafted with careful sequencing, precise finishing, and clean on-site execution.',
    image: str(item['image']) || str(item['imageUrl']) || str(item['image_url']),
  };
}

export function ServicesSection({ branding, config, className }: SectionBaseProps) {
  const companyName = str(branding.name) || 'BL Renovations';
  const serviceArea =
    str(config['serviceArea']) || str(config['service_area']) || 'Owen Sound & Grey Bruce';
  const intro =
    str(config['servicesIntro']) ||
    str(config['services_intro']) ||
    `We offer kitchen remodels, bathroom renovations, basement finishing, flooring and tile installations, fixture installations, and tailored interior upgrades throughout ${serviceArea}.`;

  const rawServices = Array.isArray(config['services']) ? config['services'] : [];
  const services = rawServices
    .map(asServiceItem)
    .filter((item): item is ServiceItem => Boolean(item))
    .slice(0, 4);

  const fallbackServices: ServiceItem[] = [
    {
      title: 'Kitchen Remodels',
      description: 'Layouts, cabinetry, surfaces, lighting, and finish coordination shaped around daily use.',
      image: '',
    },
    {
      title: 'Bathroom Renovations',
      description: 'Waterproof detailing, tile precision, fixture installation, and compact-space planning.',
      image: '',
    },
    {
      title: 'Basement Finishing',
      description: 'From framing to final trim, we turn underused square footage into purposeful living space.',
      image: '',
    },
    {
      title: 'Flooring & Tile',
      description: 'Durable material selection and careful installation for a clean, lasting result.',
      image: '',
    },
  ];

  const displayServices = services.length > 0 ? services : fallbackServices;

  return (
    <section
      className={[
        'relative overflow-hidden bg-[linear-gradient(180deg,#f7f3eb_0%,#ffffff_22%,#f4efe6_100%)] py-20 text-stone-900 md:py-28',
        className ?? '',
      ].join(' ')}
    >
      <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(163,116,57,0.18),transparent_68%)]" />
      <div className="absolute inset-y-16 left-0 w-40 bg-[linear-gradient(180deg,rgba(47,47,47,0),rgba(47,47,47,0.04),rgba(47,47,47,0))]" />
      <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(196,154,89,0.16),transparent_72%)] blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <StaggerContainer className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.2fr)] lg:items-start lg:gap-16">
          <StaggerItem>
            <div className="space-y-6">
              <p className="font-[Quicksand] text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                Our Services
              </p>
              <div className="space-y-4">
                <h2 className="font-[Sacramento] text-5xl leading-none text-stone-900 sm:text-6xl md:text-7xl">
                  Our Services
                </h2>
                <p className="max-w-xl font-[Poppins] text-base leading-8 text-stone-700 md:text-lg">
                  {intro}
                </p>
              </div>

              <div className="rounded-[28px] border border-white/70 bg-white/70 p-6 shadow-[0_18px_44px_rgba(41,30,18,0.08)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_54px_rgba(41,30,18,0.14)]">
                <p className="font-[Poppins] text-sm uppercase tracking-[0.24em] text-stone-500">
                  Interior Renovation Specialists
                </p>
                <p className="mt-3 font-[Poppins] text-sm leading-7 text-stone-700">
                  {companyName} delivers thoughtful planning, crisp site management, and finish work that
                  feels intentional from the first demolition day to the final walkthrough.
                </p>
                <Link
                  href="/visualizer"
                  className="mt-5 inline-flex items-center rounded-[4px] border border-primary/20 bg-primary px-5 py-3 font-[Quicksand] text-sm font-semibold uppercase tracking-[0.12em] text-primary-foreground transition duration-300 hover:scale-[1.02] hover:bg-primary/90"
                >
                  Get Your Free Design Estimate
                </Link>
              </div>
            </div>
          </StaggerItem>

          <div className="grid gap-5 sm:grid-cols-2">
            {displayServices.map((service, index) => (
              <StaggerItem key={`${service.title}-${index}`}>
                <article className="group relative overflow-hidden rounded-[28px] border border-stone-200/80 bg-white shadow-[0_18px_44px_rgba(41,30,18,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_54px_rgba(41,30,18,0.14)]">
                  <div className="relative h-56 overflow-hidden">
                    {service.image ? (
                      <Image
                        src={service.image}
                        alt={service.title}
                        fill
                        priority={false}
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(47,47,47,0.92),rgba(117,84,42,0.78),rgba(244,239,230,0.55))]" />
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(25,18,10,0.08),rgba(25,18,10,0.7))]" />
                    <div className="absolute left-5 top-5 rounded-full border border-white/25 bg-white/12 px-3 py-1 font-[Quicksand] text-[10px] font-semibold uppercase tracking-[0.28em] text-white backdrop-blur-sm">
                      {index + 1 < 10 ? `0${index + 1}` : index + 1}
                    </div>
                  </div>

                  <div className="space-y-3 p-6">
                    <h3 className="font-[Poppins] text-xl font-semibold text-stone-900">
                      {service.title}
                    </h3>
                    <p className="font-[Poppins] text-sm leading-7 text-stone-600">
                      {service.description}
                    </p>
                    <Link
                      href="/visualizer"
                      className="inline-flex items-center font-[Quicksand] text-sm font-semibold uppercase tracking-[0.16em] text-primary transition duration-300 group-hover:translate-x-1"
                    >
                      See your space before you build
                    </Link>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </div>
        </StaggerContainer>
      </div>
    </section>
  );
}
