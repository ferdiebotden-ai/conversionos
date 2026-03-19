'use client';

import Image from 'next/image';
import Link from 'next/link';
import { StaggerContainer, StaggerItem } from '@/components/motion';
import type { SectionBaseProps } from '@/lib/section-types';

function str(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function list(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        return str(record['title']) || str(record['name']) || str(record['label']);
      }
      return '';
    })
    .filter(Boolean);
}

export function ServicesSection({ branding, config, className }: SectionBaseProps) {
  const brandName = str(branding.name) || 'Go Hard Corporation';
  const headline =
    str(config['heroHeadline']) ||
    str(config['hero_headline']) ||
    `At ${brandName} we bring your Full Home Renovation ideas to life.`;
  const subheadline =
    str(config['heroSubheadline']) ||
    str(config['hero_subheadline']) ||
    `${brandName} is a family-owned general contracting company specializing in kitchen renovations, bathroom remodels, and home additions.`;
  const aboutCopy =
    str(config['aboutCopy']) ||
    str(config['about_copy']) ||
    'Our team of licensed general contractors, designers, and carpenters keeps every renovation organized, on schedule, and on budget from first sketch to final finish.';
  const serviceArea =
    str(config['serviceArea']) ||
    str(config['service_area']) ||
    'Kitchener, Waterloo, Cambridge, and Guelph';
  const heroImageUrl = str(config['heroImageUrl']) || str(config['hero_image_url']);
  const services =
    list(config['services']).slice(0, 4).length > 0
      ? list(config['services']).slice(0, 4)
      : ['Kitchen Renovations', 'Bathroom Remodels', 'Home Additions', 'Full Home Renovations'];

  return (
    <section
      className={[
        'relative overflow-hidden bg-[linear-gradient(180deg,#f8f5ee_0%,#ffffff_42%,#efe9dc_100%)] py-14 text-[rgb(43,44,44)] md:py-24',
        className ?? '',
      ].join(' ')}
    >
      <div className="absolute inset-0 opacity-60">
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[-8%] top-24 h-96 w-96 rounded-full bg-stone-900/8 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(90deg,transparent_0%,rgba(180,186,166,0.14)_50%,transparent_100%)]" />
      </div>

      <StaggerContainer className="relative mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:px-8">
        <StaggerItem>
          <div className="rounded-[28px] border border-white/70 bg-white/85 p-7 shadow-[0_18px_44px_rgba(43,44,44,0.08)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_60px_rgba(43,44,44,0.14)] md:p-10">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
              Our Services
            </p>
            <h2 className="max-w-4xl font-['Cormorant_Garamond'] text-4xl font-semibold leading-[0.95] tracking-[-0.03em] text-stone-900 sm:text-5xl md:text-6xl xl:text-7xl">
              <span className="font-bold">At {brandName}</span> we bring your renovation vision to
              life across <span className="text-primary">{serviceArea}</span>.
            </h2>
            <p className="mt-6 max-w-3xl font-['Raleway'] text-lg font-medium leading-8 text-[rgb(43,44,44)]/88 md:text-[1.28rem]">
              {subheadline}
            </p>
            <p className="mt-5 max-w-3xl font-['Raleway'] text-base leading-8 text-[rgb(43,44,44)]/74 md:text-lg">
              {aboutCopy}
            </p>
            <p className="mt-5 max-w-3xl font-['Raleway'] text-base leading-8 text-[rgb(43,44,44)]/74 md:text-lg">
              For nearly a decade, clients have trusted our family-run team to create spaces that
              feel composed, practical, and built with discipline at every stage.
            </p>

            <div className="mt-8 grid gap-[12px] sm:grid-cols-2">
              {services.map((service, index) => (
                <StaggerItem key={`${service}-${index}`}>
                  <div className="rounded-[28px] border border-stone-200/80 bg-stone-50/90 px-5 py-4 shadow-[0_18px_44px_rgba(43,44,44,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_60px_rgba(43,44,44,0.12)]">
                    <p className="font-['Raleway'] text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-primary/80">
                      0{index + 1}
                    </p>
                    <p className="mt-2 font-['Playfair_Display'] text-2xl leading-tight text-stone-900">
                      {service}
                    </p>
                  </div>
                </StaggerItem>
              ))}
            </div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="grid gap-4 lg:sticky lg:top-8">
            <div className="relative min-h-[280px] overflow-hidden rounded-[28px] border border-stone-200/70 bg-stone-900 shadow-[0_18px_44px_rgba(43,44,44,0.12)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_60px_rgba(43,44,44,0.18)]">
              {heroImageUrl ? (
                <Image
                  src={heroImageUrl}
                  alt={brandName}
                  fill
                  priority={false}
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(31,41,55,0.98)_0%,rgba(180,186,166,0.78)_100%)]" />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,20,20,0.18)_0%,rgba(20,20,20,0.72)_100%)]" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white md:p-7">
                <p className="font-['Raleway'] text-xs font-semibold uppercase tracking-[0.28em] text-white/72">
                  Consultation
                </p>
                <p className="mt-3 max-w-sm font-['Playfair_Display'] text-3xl leading-tight md:text-4xl">
                  Structured planning. Beautiful execution. Zero guesswork.
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/70 bg-white/88 p-6 shadow-[0_18px_44px_rgba(43,44,44,0.08)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_60px_rgba(43,44,44,0.14)] md:p-7">
              <p className="font-['Raleway'] text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                Build With Confidence
              </p>
              <p className="mt-4 font-['Playfair_Display'] text-3xl leading-tight text-stone-900">
                Design-led renovations with contractor-grade discipline.
              </p>
              <p className="mt-4 font-['Raleway'] text-base leading-7 text-[rgb(43,44,44)]/74">
                We coordinate design, permits, trades, scheduling, and finish work so the entire
                experience feels measured, clear, and worth the investment.
              </p>
              <Link
                href="/visualizer"
                className="mt-7 inline-flex w-full items-center justify-center rounded-[28px] bg-primary px-6 py-4 text-center font-['proxima-nova'] text-[14px] font-light uppercase tracking-[0.12em] text-primary-foreground transition-all duration-300 hover:scale-[1.02] hover:bg-primary/90"
              >
                Get Your Free Design Estimate
              </Link>
            </div>
          </div>
        </StaggerItem>
      </StaggerContainer>
    </section>
  );
}
