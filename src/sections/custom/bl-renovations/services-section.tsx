'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { FadeIn, FadeInUp, StaggerContainer, StaggerItem } from '@/components/motion';
import type { SectionBaseProps } from '@/lib/section-types';
import { asRecord, firstText, normalizeServices } from '@/sections/custom/_shared/content';

export function ServicesSection({ branding, config, className }: SectionBaseProps) {
  const pathname = usePathname();
  const company = asRecord(config);
  const services = normalizeServices(company['services']);
  const displayServices = services.slice(0, pathname.startsWith('/services') ? undefined : 5);
  const companyName = branding.name || 'BL Renovations';
  const intro =
    firstText(company['heroSubheadline']) ||
    `Family-owned and locally operated renovations across ${firstText(company['serviceArea']) || 'Owen Sound & Grey Bruce'}.`;

  return (
    <section className={['relative overflow-hidden bg-white py-16 text-[#2f2f2f] md:py-24', className ?? ''].join(' ')}>
      <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(235,211,203,0.45),transparent_70%)]" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(circle_at_bottom,rgba(47,47,47,0.06),transparent_70%)]" />

      <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:px-10">
        <FadeIn className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[2.2rem] border border-[#ede5db] bg-[#fbf8f4] p-8 shadow-[0_24px_60px_rgba(47,47,47,0.06)] md:p-10">
            <p className="font-[Quicksand] text-xs font-semibold uppercase tracking-[0.28em] text-[#9f7e74]">Our Services</p>
            <h2 className="mt-5 font-[Sacramento] text-[4rem] leading-none text-[#2f2f2f] sm:text-[5rem]">Our Services</h2>
            <p className="mt-6 font-[Poppins] text-[15px] leading-8 text-[#5f5a55] md:text-base">{intro}</p>
            <p className="mt-4 font-[Poppins] text-[15px] leading-8 text-[#6b6660] md:text-base">
              {companyName} focuses on kitchens, bathrooms, basements, flooring, tile, and interior finish work with a lighter, cleaner aesthetic that still feels practical to live with.
            </p>

            <div className="mt-8 grid gap-3">
              {[
                'Family-owned and locally operated',
                'Commercially bonded and insured',
                'High end custom solutions',
                'Fast and efficient project updates',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-full border border-[#eadfce] bg-white px-4 py-3 font-[Quicksand] text-sm text-[#4a4641] shadow-[0_12px_30px_rgba(47,47,47,0.04)]"
                >
                  {item}
                </div>
              ))}
            </div>

            <FadeInUp>
              <Link
                href="/visualizer"
                className="mt-8 inline-flex min-h-12 items-center justify-center rounded-[999px] bg-primary px-7 py-3 font-[Quicksand] text-sm font-semibold uppercase tracking-[0.14em] text-primary-foreground transition duration-300 hover:scale-[1.02] hover:bg-primary/90"
              >
                Get Your Free Design Estimate
              </Link>
            </FadeInUp>
          </div>
        </FadeIn>

        <StaggerContainer className="grid gap-5 md:grid-cols-2">
          {displayServices.map((service, index) => (
            <StaggerItem key={service.slug}>
              <article className="group overflow-hidden rounded-[2rem] border border-[#ede5db] bg-white shadow-[0_24px_60px_rgba(47,47,47,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_32px_70px_rgba(47,47,47,0.12)]">
                <div className="relative aspect-[4/3] overflow-hidden bg-[#f0e5d8]">
                  {service.imageUrl ? (
                    <Image
                      src={service.imageUrl}
                      alt={service.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover object-center transition duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,#f0e7de,#d3c0b2_55%,#4b4a46)]" />
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.58))]" />
                  <div className="absolute left-5 top-5 rounded-full border border-white/30 bg-white/14 px-3 py-1 font-[Quicksand] text-[10px] font-semibold uppercase tracking-[0.28em] text-white backdrop-blur-sm">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                </div>

                <div className="space-y-4 p-6 md:p-7">
                  <h3 className="font-[Poppins] text-[1.45rem] font-semibold leading-tight text-[#2f2f2f]">
                    {service.name}
                  </h3>
                  <p className="font-[Poppins] text-[15px] leading-7 text-[#69635c]">{service.description}</p>
                  <Link
                    href="/visualizer"
                    className="inline-flex items-center font-[Quicksand] text-sm font-semibold uppercase tracking-[0.16em] text-[#9f7e74] transition duration-300 group-hover:translate-x-1"
                  >
                    See your space before you build
                  </Link>
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
