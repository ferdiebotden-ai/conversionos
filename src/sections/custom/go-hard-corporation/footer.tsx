'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import Image from 'next/image';
import Link from 'next/link';
import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn } from '@/components/motion';

export function Footer({ branding, config, tokens, className }: SectionBaseProps) {
  function str(v: unknown): string {
    return typeof v === 'string' && v.trim() ? v.trim() : '';
  }

  function list(v: unknown): string[] {
    return Array.isArray(v) ? v.map((item) => str(item)).filter(Boolean) : [];
  }

  const brandName = str(branding['name']) || 'Go Hard Corporation';
  const phone = str(config['phone']) || str(config['phone_number']) || str(branding['phone']);
  const email = str(config['email']) || str(config['contact_email']) || str(branding['email']);
  const address = str(config['address']) || str(config['location']) || str(branding['address']);
  const logoUrl = str(config['logoUrl']) || str(config['logo_url']) || str(branding['logo_url']);
  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Services', href: '/services' },
    { label: 'Projects', href: '/projects' },
    { label: 'Contact', href: '/contact' },
  ];

  const brandingSocials = Array.isArray((branding as Record<string, unknown>)['socials'])
    ? ((branding as Record<string, unknown>)['socials'] as { label: string; href: string }[])
    : [];
  const socialItems = brandingSocials.length > 0
    ? brandingSocials
    : [
        { label: 'Facebook', href: '#' },
        { label: 'Instagram', href: '#' },
      ];

  return (
    <footer
      className={`overflow-hidden bg-[rgb(32,32,32)] text-primary-foreground ${className ?? ''}`}
    >
      <FadeIn>
        <div className="border-t border-white/10" />
      </FadeIn>

      <div className="mx-auto max-w-7xl px-6 py-14 md:px-10 md:py-16 lg:px-14">
        <StaggerContainer className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <StaggerItem>
            <div className="max-w-md">
              <div className="flex items-center gap-4">
                <ScaleIn>
                  <div className="relative h-16 w-16 overflow-hidden rounded-full border border-white/15 bg-white/5">
                    {logoUrl ? (
                      <Image
                        src={logoUrl}
                        alt={brandName}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-white/10" />
                    )}
                  </div>
                </ScaleIn>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.34em] text-white/55">Contact</p>
                  <h2 className="mt-1 font-serif text-[28px] font-normal leading-none text-white md:text-[33px]">
                    {brandName}
                  </h2>
                </div>
              </div>

              <FadeInUp>
                <div className="mt-7 space-y-3 text-[15px] font-light leading-7 text-white/78">
                  {phone ? <a href={`tel:${phone}`} className="block transition hover:text-white">{phone}</a> : null}
                  {email ? <a href={`mailto:${email}`} className="block transition hover:text-white">{email}</a> : null}
                  {address ? <p className="max-w-xs whitespace-pre-line">{address}</p> : null}
                </div>
              </FadeInUp>

              <FadeInUp>
                <Link
                  href="/visualizer"
                  className="mt-8 inline-flex min-h-11 items-center justify-center bg-primary px-6 py-3 text-center font-sans text-[12px] font-light uppercase tracking-[0.18em] text-primary-foreground transition hover:brightness-105"
                >
                  Get Your Free Design Estimate
                </Link>
              </FadeInUp>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-white/55">Navigation</p>
              <ul className="mt-6 space-y-3">
                {navItems.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-[14px] font-light uppercase tracking-[0.16em] text-white/82 transition hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-white/55">Follow</p>
              <ul className="mt-6 space-y-3">
                {socialItems.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[14px] font-light uppercase tracking-[0.16em] text-white/82 transition hover:text-white"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </StaggerItem>
        </StaggerContainer>

        <FadeInUp>
          <div className="mt-14 border-t border-white/10 pt-5 text-[11px] uppercase tracking-[0.2em] text-white/45">
            {brandName} | All Rights Reserved
          </div>
        </FadeInUp>
      </div>
    </footer>
  );
}
