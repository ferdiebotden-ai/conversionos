'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import Image from 'next/image';
import Link from 'next/link';
import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn } from '@/components/motion';

export function Footer({ branding, config, tokens, className }: SectionBaseProps) {
  function str(v: unknown): string {
    return typeof v === 'string' && v.trim() ? v.trim() : '';
  }

  function rec(v: unknown): Record<string, unknown> {
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  }

  const logoUrl = str(config['logoUrl']) || str(config['logo_url']) || str(branding.logo_url);
  const serviceArea = str(config['serviceArea']) || str(config['service_area']);
  const servicesRaw = Array.isArray(config['services']) ? config['services'] : [];
  const services = servicesRaw.slice(0, 3).map((item) => rec(item));
  const socialLinksRaw = Array.isArray(config['socialLinks']) ? config['socialLinks'] : Array.isArray(config['social_links']) ? config['social_links'] : [];
  const socialLinks = socialLinksRaw.length ? socialLinksRaw.slice(0, 3).map((item) => rec(item)) : [{ label: 'Instagram', url: '#' }, { label: 'Facebook', url: '#' }, { label: 'LinkedIn', url: '#' }];
  const navLinks = [{ href: '#services', label: 'Services' }, { href: '#about', label: 'About' }, { href: '#gallery', label: 'Projects' }, { href: '/visualizer', label: 'Estimate' }];
  const phoneHref = branding.phone ? `tel:${branding.phone.replace(/[^\d+]/g, '')}` : '';
  const emailHref = branding.email ? `mailto:${branding.email}` : '';
  const tokenCount = tokens && typeof tokens === 'object' ? Object.keys(tokens as Record<string, unknown>).length : 0;

  return (
    <footer
      data-token-count={tokenCount}
      className={`relative overflow-hidden bg-primary text-primary-foreground ${className ?? ''}`}
    >
      <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, oklch(var(--primary) / 0.98), oklch(var(--primary) / 0.82))' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at top left, oklch(var(--background) / 0.12), transparent 34%)' }} />

      <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-14 md:px-6 md:pt-20">
        <FadeInUp>
          <div className="rounded-[30px] border border-white/14 bg-white/10 px-6 py-6 backdrop-blur-sm md:flex md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-primary-foreground/68">Ready to start</p>
              <h2 className="mt-2 font-heading text-2xl font-bold md:text-3xl">Bring your next build into focus.</h2>
            </div>
            <Link
              href="/visualizer"
              className="mt-4 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary transition-transform duration-200 hover:scale-[1.01] md:mt-0"
            >
              Get Your Free Design Estimate
            </Link>
          </div>
        </FadeInUp>

        <StaggerContainer>
          <div className="mt-12 grid gap-10 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
            <ScaleIn>
              <div>
                <div className="flex items-center gap-4">
                  <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/16">
                    {logoUrl ? (
                      <Image src={logoUrl} alt={`${branding.name} logo`} fill className="object-cover" sizes="56px" />
                    ) : (
                      <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(135deg, oklch(var(--background) / 0.24), oklch(var(--background) / 0.08))' }} />
                    )}
                  </div>
                  <div>
                    <p className="font-heading text-xl font-semibold">{branding.name}</p>
                    <p className="text-sm text-primary-foreground/72">{serviceArea || 'Custom construction and renovation'}</p>
                  </div>
                </div>
                <p className="mt-5 max-w-sm text-sm leading-7 text-primary-foreground/82">Detail-forward planning, measured execution, and a process built to keep projects clear from consultation to completion.</p>
              </div>
            </ScaleIn>

            <StaggerItem>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary-foreground/66">Navigate</p>
                <div className="mt-4 flex flex-col gap-3 text-sm">
                  {navLinks.map((link) => (
                    <Link key={link.label} href={link.href} className="transition-opacity hover:opacity-80">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary-foreground/66">Contact</p>
                <div className="mt-4 flex flex-col gap-3 text-sm text-primary-foreground/84">
                  <p>{branding.address || 'Serving clients with tailored construction support.'}</p>
                  {branding.phone ? <a href={phoneHref} className="transition-opacity hover:opacity-80">{branding.phone}</a> : <p>Call for consultation scheduling</p>}
                  {branding.email ? <a href={emailHref} className="transition-opacity hover:opacity-80">{branding.email}</a> : <p>Reach out for scope planning</p>}
                </div>
              </div>
            </StaggerItem>

            <FadeIn>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary-foreground/66">Services and Social</p>
                <div className="mt-4 flex flex-col gap-3 text-sm text-primary-foreground/84">
                  {services.length > 0 ? (
                    services.map((service, index) => <p key={`${str(service['name']) || 'featured'}-${index}`}>{str(service['name']) || `Service ${index + 1}`}</p>)
                  ) : (
                    <>
                      <p>Custom Renovations</p>
                      <p>Interior Build-Outs</p>
                      <p>Project Coordination</p>
                    </>
                  )}
                </div>
                <div className="mt-6 flex flex-col gap-3 text-sm text-primary-foreground/84">
                  {socialLinks.map((item, index) => <a key={`${str(item['label']) || 'social'}-${index}`} href={str(item['url']) || str(item['href']) || '#'} className="transition-opacity hover:opacity-80">{str(item['label']) || str(item['name']) || `Social ${index + 1}`}</a>)}
                </div>
              </div>
            </FadeIn>
          </div>
        </StaggerContainer>

        <div className="mt-12 border-t border-white/14 pt-6 text-sm text-primary-foreground/70">
          <p>&copy; {new Date().getFullYear()} {branding.name}. Built for design-led construction projects.</p>
        </div>
      </div>
    </footer>
  );
}
