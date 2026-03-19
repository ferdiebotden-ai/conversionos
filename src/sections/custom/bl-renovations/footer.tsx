'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import Image from 'next/image';
import Link from 'next/link';
import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn } from '@/components/motion';

export function Footer({ branding, config, tokens, className }: SectionBaseProps) {
  function str(v: unknown): string {
    return typeof v === 'string' && v.trim() ? v.trim() : '';
  }

  function asRecord(v: unknown): Record<string, unknown> {
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  }

  const brand = asRecord(branding);
  const companyName = str(brand['name']) || 'BL Renovations';
  const phone = str(brand['phone']) || str(config['phone']) || str(config['phone_number']);
  const email = str(brand['email']) || str(config['email']);
  const address = str(brand['address']) || str(config['address']);
  const logoUrl = str(brand['logo_url']) || str(config['logoUrl']) || str(config['logo_url']);

  const navigation = [
    { label: 'Home', href: '#top' },
    { label: 'About', href: '#about' },
    { label: 'Services', href: '#services' },
    { label: 'Gallery', href: '#gallery' },
    { label: 'Contact', href: '#contact' },
  ];

  const socialItems = [
    {
      label: 'Facebook',
      href: str(config['facebookUrl']) || str(config['facebook_url']) || '#',
    },
    {
      label: 'Instagram',
      href: str(config['instagramUrl']) || str(config['instagram_url']) || '#',
    },
    {
      label: 'Houzz',
      href: str(config['houzzUrl']) || str(config['houzz_url']) || '#',
    },
  ].filter((item) => item.href && item.href !== '#');

  return (
    <footer
      className={`bg-[#f3f3f1] text-[#444444] ${className ?? ''}`}
      style={{ fontFamily: 'Quicksand, sans-serif' }}
    >
      <div className="mx-auto max-w-6xl px-6 py-14 md:px-10 md:py-16">
        <StaggerContainer className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.2fr_0.8fr_1fr_0.9fr]">
          <StaggerItem>
            <FadeIn>
              <div className="space-y-5">
                <div className="relative h-16 w-40 overflow-hidden">
                  {logoUrl ? (
                    <Image
                      src={logoUrl}
                      alt={companyName}
                      fill
                      priority={false}
                      className="object-contain object-left"
                      sizes="160px"
                    />
                  ) : (
                    <ScaleIn>
                      <div className="flex h-full items-center bg-gradient-to-r from-primary/15 to-primary/5 px-2">
                        <span
                          className="block text-[2rem] leading-none text-[#2f2f2f]"
                          style={{ fontFamily: 'Sacramento, cursive' }}
                        >
                          {companyName}
                        </span>
                      </div>
                    </ScaleIn>
                  )}
                </div>
                <p className="max-w-sm text-sm leading-7 text-muted-foreground">
                  Quality renovations and thoughtful craftsmanship for kitchens,
                  bathrooms, interiors, and custom home improvements.
                </p>
                <FadeInUp>
                  <Link
                    href="/visualizer"
                    className="inline-flex rounded-[4px] border border-[#d5d5d2] px-5 py-3 text-[16px] font-normal tracking-[1px] text-[#444444] transition-colors hover:bg-white"
                  >
                    Get Your Free Design Estimate
                  </Link>
                </FadeInUp>
              </div>
            </FadeIn>
          </StaggerItem>

          <StaggerItem>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-[2px] text-[#222222]">
                Navigation
              </h3>
              <nav className="flex flex-col gap-3 text-sm">
                {navigation.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="w-fit text-muted-foreground transition-colors hover:text-[#222222]"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-[2px] text-[#222222]">
                Contact
              </h3>
              <div className="space-y-3 text-sm leading-7 text-muted-foreground">
                {phone && <a href={`tel:${phone}`} className="block hover:text-[#222222]">{phone}</a>}
                {email && <a href={`mailto:${email}`} className="block break-all hover:text-[#222222]">{email}</a>}
                {address && <p className="max-w-xs">{address}</p>}
              </div>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-[2px] text-[#222222]">
                Follow
              </h3>
              <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                {socialItems.length > 0 ? (
                  socialItems.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="w-fit transition-colors hover:text-[#222222]"
                    >
                      {item.label}
                    </a>
                  ))
                ) : (
                  <p>Find us on social media for project updates and inspiration.</p>
                )}
              </div>
            </div>
          </StaggerItem>
        </StaggerContainer>
      </div>

      <div className="border-t border-[#ddddda] px-6 py-5 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 text-center text-xs uppercase tracking-[1.6px] text-muted-foreground md:flex-row md:items-center md:justify-between md:text-left">
          <p>{companyName}</p>
          <p>All Rights Reserved</p>
        </div>
      </div>
    </footer>
  );
}
