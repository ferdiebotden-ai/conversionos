'use client';

import Link from 'next/link';
import type { SectionBaseProps } from '@/lib/section-types';
import { useEffect, useState } from 'react';

const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
const titleFromSlug = (slug: string) => (slug.replace(/^\//, '').replace(/[-_]+/g, ' ').trim() || 'home').replace(/\b\w/g, (char) => char.toUpperCase());
const navLinkClass = (active: boolean, scrolled: boolean) => `font-[Inter] text-[14px] font-semibold uppercase tracking-[1.5px] transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${active ? 'text-[var(--sticky-accent)]' : scrolled ? 'text-foreground hover:text-[var(--sticky-accent)]' : 'text-primary-foreground hover:text-[var(--sticky-accent)]'}`;

export function StickyNavigationBar({ branding, config, tokens, className }: SectionBaseProps) {
  const brand = asRecord(branding);
  const cfg = asRecord(config);
  const businessInfo = asRecord(cfg['business_info']);
  const theme = asRecord(tokens);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pathname, setPathname] = useState('/');

  const businessName = [brand['business_name'], brand['name'], cfg['business_name'], branding.name].find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  const phone = [businessInfo['phone'], cfg['phone'], branding.phone].find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  const links = (Array.isArray(cfg['pages']) ? cfg['pages'] : []).flatMap((page) => {
    const item = asRecord(page);
    const rawSlug = typeof item['slug'] === 'string' ? item['slug'] : typeof item['path'] === 'string' ? item['path'] : '';
    if (!rawSlug) return [];
    const href = rawSlug === 'home' ? '/' : rawSlug.startsWith('/') ? rawSlug : `/${rawSlug}`;
    const label = typeof item['title'] === 'string' ? item['title'] : typeof item['name'] === 'string' ? item['name'] : titleFromSlug(rawSlug);
    return [{ href, label }];
  });

  useEffect(() => {
    const syncState = () => { setIsScrolled(window.scrollY > 24); setPathname(window.location.pathname || '/'); };
    syncState();
    window.addEventListener('scroll', syncState, { passive: true });
    return () => window.removeEventListener('scroll', syncState);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setIsMenuOpen(false);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMenuOpen]);

  if (!businessName || links.length === 0) return null;

  const phoneHref = phone ? `tel:${phone.replace(/[^+\d]/g, '')}` : null;
  const accent = typeof theme['primary'] === 'string' ? theme['primary'] : 'oklch(0.45 0.08 10.5)';

  return (
    <section className={className}>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 top-0 z-50 w-full border-b border-transparent transition-all duration-300"
        style={{ ['--sticky-accent' as string]: accent, backgroundColor: isScrolled ? 'oklch(1 0 0 / 0.96)' : 'transparent', boxShadow: isScrolled ? '0 12px 32px oklch(0.18 0.02 20 / 0.12)' : 'none', height: isScrolled ? '80px' : '149px' }}
      >
        <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-6 md:px-10 xl:px-[90px]">
          <Link href="/" className={`truncate font-[Inter] text-base font-semibold uppercase tracking-[1.5px] transition-colors focus:outline-none focus:ring-2 focus:ring-primary md:text-lg ${isScrolled ? 'text-foreground hover:text-[var(--sticky-accent)]' : 'text-primary-foreground hover:text-[var(--sticky-accent)]'}`}>
            {businessName}
          </Link>

          <div className="hidden items-center gap-4 min-[1000px]:flex">
            {links.map((link) => <Link key={link.href} href={link.href} className={navLinkClass(pathname === link.href, isScrolled)}>{link.label}</Link>)}
            {phoneHref ? <Link href={phoneHref} className="rounded-[4px] border border-primary px-5 py-3 font-[Inter] text-[18px] font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary">{phone}</Link> : null}
          </div>

          <button
            type="button"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
            className={`relative h-11 w-11 focus:outline-none focus:ring-2 focus:ring-primary min-[1000px]:hidden ${isScrolled ? 'text-foreground' : 'text-primary-foreground'}`}
          >
            <span className="absolute left-1/2 top-1/2 h-[2px] w-6 -translate-x-1/2 -translate-y-[7px] rounded-full bg-current transition duration-300 data-[open=true]:translate-y-0 data-[open=true]:rotate-45" data-open={isMenuOpen} />
            <span className="absolute left-1/2 top-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full bg-current transition duration-300 data-[open=true]:opacity-0" data-open={isMenuOpen} />
            <span className="absolute left-1/2 top-1/2 h-[2px] w-6 -translate-x-1/2 translate-y-[7px] rounded-full bg-current transition duration-300 data-[open=true]:translate-y-0 data-[open=true]:-rotate-45" data-open={isMenuOpen} />
          </button>
        </div>
      </nav>

      <div aria-hidden="true" onClick={() => setIsMenuOpen(false)} className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 min-[1000px]:hidden ${isMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`} />
      <article className={`fixed right-0 top-0 z-50 flex h-screen w-[min(88vw,360px)] flex-col bg-white px-6 pb-8 pt-24 shadow-2xl transition-transform duration-300 min-[1000px]:hidden ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-1 flex-col gap-5">
          {links.map((link) => (
            <Link
              key={`mobile-${link.href}`}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
              className={`font-[Inter] text-[14px] font-semibold uppercase tracking-[1.5px] transition-colors hover:text-[var(--sticky-accent)] focus:outline-none focus:ring-2 focus:ring-primary ${pathname === link.href ? 'text-[var(--sticky-accent)]' : 'text-foreground'}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
        {phoneHref ? <Link href={phoneHref} onClick={() => setIsMenuOpen(false)} className="mt-8 inline-flex items-center justify-center rounded-[4px] border border-primary px-5 py-3 font-[Inter] text-[18px] font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary">{phone}</Link> : null}
      </article>
    </section>
  );
}
