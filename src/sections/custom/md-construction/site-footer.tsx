'use client';

import Image from 'next/image';
import Link from 'next/link';

import type { SectionBaseProps } from '@/lib/section-types';

type FooterLink = { label: string; href: string };

const toRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const toText = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

function toServiceLinks(value: unknown): FooterLink[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (typeof item === 'string' && item.trim()) {
      const label = item.trim();
      return [{ label, href: `/#${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` }];
    }

    const data = toRecord(item);
    const label = data ? toText(data['label']) ?? toText(data['name']) ?? toText(data['title']) : null;
    if (!label) return [];

    return [
      {
        label,
        href: toText(data?.['href']) ?? toText(data?.['link']) ?? `/#${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      },
    ];
  });
}

export function SiteFooter({ branding, config, tokens, className }: SectionBaseProps) {
  void tokens;
  const brand = toRecord(branding);
  const section = toRecord(config);
  const info = toRecord(section?.['business_info']);

  const businessName = toText(section?.['business_name']) ?? toText(brand?.['business_name']) ?? toText(branding.name);
  const tagline = toText(section?.['tagline']) ?? toText(brand?.['tagline']) ?? toText(branding.tagline);
  const phone = toText(info?.['phone']) ?? toText(branding.phone);
  const email = toText(info?.['email']) ?? toText(branding.email);
  const address = toText(info?.['address']) ?? toText(branding.address);
  const logo = toText(brand?.['logo']) ?? toText(brand?.['logo_url']) ?? toText(section?.['logo']) ?? branding.logoUrl?.trim() ?? null;
  const services = toServiceLinks(section?.['services'] ?? brand?.['services']);

  if (!businessName || !tagline || !phone || !email || !address || services.length === 0) {
    return null;
  }
  const quickLinks: FooterLink[] = [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/#about' },
    { label: 'Services', href: '/#services' },
    { label: 'Projects', href: '/#projects' },
    { label: 'Contact', href: '/#contact' },
    { label: 'Design Studio', href: '/visualizer' },
  ];

  const headingClass = 'font-[Poppins] text-sm font-semibold uppercase tracking-[1px] text-white';
  const linkClass =
    'font-[Inter] text-[15px] leading-6 text-muted-foreground text-[oklch(var(--light,1_0_0)/0.7)] transition-colors hover:text-[oklch(var(--accentDark,0.84_0.17_93.5))] focus:outline-none focus:ring-2 focus:ring-primary';
  return (
    <footer className={className ?? ''}>
      <section
        aria-label="Footer"
        className="bg-primary text-primary-foreground bg-[oklch(var(--dark,0.23_0.02_350))]"
      >
        <div className="mx-auto max-w-[1400px] px-6 py-16 md:px-[90px] lg:py-20">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
            <article className="space-y-5">
              <div className="flex items-center gap-4">
                {logo ? (
                  <div className="relative h-12 w-12 overflow-hidden rounded-sm border border-white/10 bg-white/5">
                    <Image src={logo} alt={`${businessName} logo`} fill sizes="48px" className="object-contain p-1" />
                  </div>
                ) : null}
                <p className="font-[Inter] text-lg font-semibold text-white">{businessName}</p>
              </div>

              <p className="max-w-xs font-[Inter] text-[15px] leading-7 text-[oklch(var(--light,1_0_0)/0.6)]">
                {tagline}
              </p>

              <div className="h-px w-20 bg-[oklch(var(--accentDark,0.84_0.17_93.5))]" />

              <p className="font-[Inter] text-[13px] leading-6 text-[oklch(var(--light,1_0_0)/0.7)]">
                Powered by ConversionOS. Explore the{' '}
                <Link href="/visualizer" className={`${linkClass} font-semibold text-white`}>
                  Design Studio
                </Link>
                .
              </p>
            </article>

            <nav aria-label="Quick links" className="space-y-5">
              <h5 className={headingClass}>Quick Links</h5>
              <div className="flex flex-col gap-3">
                {quickLinks.map((link) => (
                  <Link key={link.label} href={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>

            <nav aria-label="Services" className="space-y-5">
              <h5 className={headingClass}>Services</h5>
              <div className="flex flex-col gap-3">
                {services.map((service) => (
                  <Link key={`${service.label}-${service.href}`} href={service.href} className={linkClass}>
                    {service.label}
                  </Link>
                ))}
              </div>
            </nav>

            <article className="space-y-5">
              <h5 className={headingClass}>Contact</h5>
              <div className="flex flex-col gap-3 font-[Inter] text-[15px] leading-7 text-[oklch(var(--light,1_0_0)/0.7)]">
                <p>{address}</p>
                <Link href={`tel:${phone.replace(/[^+\d]/g, '')}`} className={linkClass}>
                  {phone}
                </Link>
                <Link href={`mailto:${email}`} className={linkClass}>
                  {email}
                </Link>
                <Link href="/visualizer" className={`${linkClass} pt-2 font-semibold text-white`}>
                  Get Your Free Design Estimate
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section
        aria-label="Footer legal"
        className="bg-[oklch(var(--nectar-accent-color,0.46_0.11_14))] px-6 py-4 text-center text-white md:px-[90px]"
      >
        <p className="font-[Inter] text-[13px] leading-5">© 2026 MD Construction. All rights reserved.</p>
      </section>
    </footer>
  );
}
