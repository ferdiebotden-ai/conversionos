'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { FadeIn, FadeInUp, StaggerContainer, StaggerItem } from '@/components/motion';
import type { SectionBaseProps } from '@/lib/section-types';
import { asRecord, firstText, normalizeServices, textList } from '@/sections/custom/_shared/content';

const FALLBACK_SERVICES = [
  {
    name: 'Kitchen Renovation',
    slug: 'kitchen-renovation',
    description: 'Thoughtful kitchen renovations with custom cabinetry, layout planning, and finish coordination.',
    imageUrl: '',
    features: [],
  },
  {
    name: 'Bathroom Renovation',
    slug: 'bathroom-renovation',
    description: 'Bathrooms rebuilt with cleaner layouts, durable tilework, and comfort-first detailing.',
    imageUrl: '',
    features: [],
  },
  {
    name: 'Home Additions',
    slug: 'home-additions',
    description: 'Home additions planned from design through build so the new square footage feels seamless.',
    imageUrl: '',
    features: [],
  },
];

export function ServicesSection({ branding, config, className }: SectionBaseProps) {
  const pathname = usePathname();
  const company = asRecord(config);
  const services = normalizeServices(company['services']);
  const displayServices = (services.length ? services : FALLBACK_SERVICES).slice(
    0,
    pathname.startsWith('/services') ? undefined : 6
  );

  const serviceArea =
    firstText(company['serviceArea'], company['service_area']) ||
    'Kitchener, Waterloo, Cambridge, and Guelph';
  const intro =
    firstText(company['heroSubheadline']) ||
    'We specialize in kitchens, bathrooms, and home additions from design and permits to build.';
  const bodyParagraphs = textList(company['aboutCopy']).slice(0, 2);
  const companyName = branding.name || 'Go Hard Corporation';

  return (
    <section
      className={[
        'relative overflow-hidden bg-[linear-gradient(180deg,#f8f5ef_0%,#ffffff_40%,#f2eee6_100%)] py-16 text-[#2b2c2c] md:py-24',
        className ?? '',
      ].join(' ')}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(90,87,68,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(43,44,44,0.06),transparent_28%)]" />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-5 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-10">
        <FadeIn className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[2rem] border border-[#d9d3c6] bg-white/80 p-8 shadow-[0_24px_60px_rgba(41,35,28,0.08)] backdrop-blur-sm md:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Our Services</p>
            <h2
              className="mt-5 text-[clamp(2.6rem,5vw,5.25rem)] font-semibold leading-[0.94] text-[#23231f]"
              style={{ fontFamily: '"Playfair Display","Cormorant Garamond",serif' }}
            >
              At Go Hard Corporation we bring your Full Home Renovation ideas to life.
            </h2>
            <p className="mt-6 text-base leading-8 text-[#52514a] md:text-lg">{intro}</p>
            {(bodyParagraphs.length ? bodyParagraphs : [
              `${companyName} handles kitchens, bathrooms, additions, and interior renovations with one coordinated design-build process.`,
              `Every stage is planned around schedule clarity, finish quality, and the way the home needs to function day to day across ${serviceArea}.`,
            ]).map((paragraph, index) => (
              <p key={`${paragraph}-${index}`} className="mt-4 text-[15px] leading-8 text-[#67645b] md:text-base">
                {paragraph}
              </p>
            ))}

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-[#e6dfd2] bg-[#f8f4eb] px-5 py-4">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#7c776b]">Service Area</p>
                <p className="mt-2 text-base leading-7 text-[#2b2c2c]">{serviceArea}</p>
              </div>
              <div className="rounded-[1.5rem] border border-[#e6dfd2] bg-[#23231f] px-5 py-4 text-white">
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/60">Approach</p>
                <p className="mt-2 text-base leading-7 text-white/84">Design, selections, scheduling, and construction kept in one flow.</p>
              </div>
            </div>

            <FadeInUp>
              <Link
                href="/visualizer"
                className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-7 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-primary-foreground transition duration-300 hover:scale-[1.02] hover:bg-primary/90"
              >
                Get Your Free Design Estimate
              </Link>
            </FadeInUp>
          </div>
        </FadeIn>

        <StaggerContainer className="grid gap-5 md:grid-cols-2">
          {displayServices.map((service, index) => (
            <StaggerItem key={service.slug}>
              <article className="group overflow-hidden rounded-[2rem] border border-[#ddd6c8] bg-white shadow-[0_24px_60px_rgba(41,35,28,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_32px_70px_rgba(41,35,28,0.14)]">
                <div className="relative aspect-[4/3] overflow-hidden bg-[#ebe4d7]">
                  {service.imageUrl ? (
                    <Image
                      src={service.imageUrl}
                      alt={service.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover object-center transition duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,#ded8cb,#b8b3a3_55%,#4f4c40)]" />
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.55))]" />
                  <div className="absolute left-5 top-5 rounded-full border border-white/30 bg-white/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white backdrop-blur-sm">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                </div>

                <div className="space-y-4 p-6 md:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <h3
                      className="text-[1.6rem] leading-tight text-[#23231f]"
                      style={{ fontFamily: '"Playfair Display","Cormorant Garamond",serif' }}
                    >
                      {service.name}
                    </h3>
                    <span className="shrink-0 text-[11px] uppercase tracking-[0.24em] text-[#7c776b]">Photo-led</span>
                  </div>

                  <p className="text-[15px] leading-7 text-[#666257]">{service.description}</p>

                  {service.features.length > 0 ? (
                    <ul className="grid gap-2 text-sm leading-6 text-[#535148]">
                      {service.features.slice(0, 3).map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <span aria-hidden="true" className="mt-2 size-1.5 rounded-full bg-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
