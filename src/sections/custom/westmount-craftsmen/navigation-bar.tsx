'use client';

import Image from 'next/image';
import Link from 'next/link';

import type { SectionBaseProps } from '@/lib/section-types';

const HOUSE_ICON =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <path d="M10 30.5 32 12l22 18.5" stroke="#0e79eb" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M18 27.5V52h28V27.5" fill="#0e79eb" fill-opacity="0.12" stroke="#0e79eb" stroke-width="4" stroke-linejoin="round"/>
      <path d="M27 52V36h10v16" stroke="#0e79eb" stroke-width="4" stroke-linejoin="round"/>
    </svg>
  `);

type NavItem = {
  label: string;
  href: string;
};

type DataRecord = Record<string, unknown>;

const FALLBACK_NAV: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about-us' },
  { label: 'Services', href: '/services' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Contact', href: '/contact' },
];

function titleFromSlug(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeHref(slug: string) {
  if (!slug || slug === 'home') return '/';
  return slug.startsWith('/') ? slug : `/${slug}`;
}

function asRecord(value: unknown): DataRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as DataRecord)
    : null;
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return null;
}

function extractPhone(config: SectionBaseProps['config']) {
  const configRecord = asRecord(config);
  const businessInfo = asRecord(configRecord?.['business_info']);

  const rawPhone = pickString(
    businessInfo?.['phone'],
    businessInfo?.['phone_number'],
    businessInfo?.['primary_phone'],
    config.phone,
  );

  if (!rawPhone) return null;

  const digits = rawPhone.replace(/\D/g, '');
  const tel = digits.length === 11 && digits.startsWith('1') ? `+${digits}` : `+1${digits}`;

  return {
    display: rawPhone,
    tel,
  };
}

function extractBusinessName(
  branding: SectionBaseProps['branding'],
  config: SectionBaseProps['config'],
) {
  const configRecord = asRecord(config);
  const businessInfo = asRecord(configRecord?.['business_info']);

  return (
    branding?.name ??
    pickString(configRecord?.['business_name'], businessInfo?.['business_name'], config.name) ??
    null
  );
}

function extractNavItems(config: SectionBaseProps['config']) {
  const configRecord = asRecord(config);
  const navigation = asRecord(configRecord?.['navigation']);
  const pageSources = [
    configRecord?.['page_slugs'],
    configRecord?.['pages'],
    configRecord?.['navigation'],
    navigation?.['links'],
  ];

  for (const source of pageSources) {
    if (!Array.isArray(source)) continue;

    const items = source
      .map((entry) => {
        if (typeof entry === 'string') {
          return { label: titleFromSlug(entry), href: normalizeHref(entry) };
        }

        if (!entry || typeof entry !== 'object') return null;

        const record = entry as Record<string, unknown>;
        const slug = pickString(record['slug'], record['page_slug'], record['href']);

        if (!slug) return null;

        return {
          label: pickString(record['label'], record['title']) ?? titleFromSlug(slug.replace(/^\//, '')),
          href: normalizeHref(slug),
        };
      })
      .filter((item): item is NavItem => Boolean(item));

    if (items.length > 0) {
      return FALLBACK_NAV.map(
        (fallback) => items.find((item) => item.label.toLowerCase() === fallback.label.toLowerCase()) ?? fallback,
      );
    }
  }

  return FALLBACK_NAV;
}

export function NavigationBar({ branding, config, tokens, className }: SectionBaseProps) {
  const businessName = extractBusinessName(branding, config);
  const phone = extractPhone(config);
  const navItems = extractNavItems(config);

  if (!businessName) return null;

  const slideoutWidth =
    typeof tokens === 'object' && tokens && 'slideoutWidth' in tokens
      ? String(asRecord(tokens)?.['slideoutWidth'])
      : '265px';

  return (
    <section
      className={[
        'sticky top-0 z-50 border-b border-[#f2f2f2] bg-white',
        'text-[oklch(var(--contrast,0.145_0_0))]',
        className ?? '',
      ].join(' ')}
    >
      <nav aria-label="Primary" className="mx-auto max-w-[1700px] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[84px] items-center justify-between gap-4">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-3 rounded-md py-3 pr-2 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label={`${businessName} home`}
          >
            <Image src={HOUSE_ICON} alt="" width={38} height={38} className="h-9 w-9 shrink-0" unoptimized />
            <div className="min-w-0">
              <span className="block truncate font-[Mulish,sans-serif] text-lg font-semibold tracking-[0.01em] text-[oklch(var(--contrast,0.145_0_0))]">
                {businessName}
              </span>
            </div>
          </Link>

          <div className="hidden flex-1 items-center justify-end gap-6 lg:flex">
            <div className="flex items-center gap-7 xl:gap-8">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="font-[Mulish,sans-serif] text-[15px] font-medium leading-5 text-[oklch(var(--contrast,0.145_0_0))] transition-colors duration-200 hover:text-[oklch(var(--accent,0.62_0.16_251.5))] focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {phone ? (
              <Link
                href={`tel:${phone.tel}`}
                className="whitespace-nowrap font-[Mulish,sans-serif] text-[15px] font-medium leading-5 text-[oklch(var(--accent,0.62_0.16_251.5))] transition-opacity duration-200 hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {phone.display}
              </Link>
            ) : null}

            <Link
              href="/visualizer"
              className="inline-flex items-center justify-center rounded-[6px] bg-[#0e79eb] px-5 py-3 font-[Mulish,sans-serif] text-[15px] font-medium leading-5 text-white transition-colors duration-200 hover:bg-[#1a6fc9] focus:outline-none focus:ring-2 focus:ring-primary"
            >
              Get A Free Estimate
            </Link>
          </div>

          <details className="group lg:hidden">
            <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-md border border-[#f2f2f2] bg-white text-[oklch(var(--contrast,0.145_0_0))] transition-colors duration-200 hover:text-[oklch(var(--accent,0.62_0.16_251.5))] focus:outline-none focus:ring-2 focus:ring-primary">
              <span className="sr-only">Open navigation menu</span>
              <span className="flex flex-col gap-1.5">
                <span className="block h-0.5 w-5 rounded-full bg-current" />
                <span className="block h-0.5 w-5 rounded-full bg-current" />
                <span className="block h-0.5 w-5 rounded-full bg-current" />
              </span>
            </summary>

            <div className="fixed inset-0 z-40 hidden bg-black/30 group-open:block" aria-hidden="true" />
            <div
              className="fixed inset-y-0 left-0 z-50 flex translate-x-[-100%] flex-col border-r border-[#f2f2f2] bg-white p-6 shadow-xl transition-transform duration-300 group-open:translate-x-0"
              style={{ width: slideoutWidth }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Image src={HOUSE_ICON} alt="" width={34} height={34} className="h-8 w-8 shrink-0" unoptimized />
                  <span className="truncate font-[Mulish,sans-serif] text-base font-semibold text-[oklch(var(--contrast,0.145_0_0))]">
                    {businessName}
                  </span>
                </div>
              </div>

              <div className="mt-10 flex flex-1 flex-col gap-2">
                {navItems.map((item) => (
                  <Link
                    key={`mobile-${item.label}`}
                    href={item.href}
                    className="rounded-md px-2 py-3 font-[Mulish,sans-serif] text-[15px] font-medium leading-5 text-[oklch(var(--contrast,0.145_0_0))] transition-colors duration-200 hover:text-[oklch(var(--accent,0.62_0.16_251.5))] focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="mt-8 space-y-4 border-t border-[#f2f2f2] pt-6">
                {phone ? (
                  <Link
                    href={`tel:${phone.tel}`}
                    className="block font-[Mulish,sans-serif] text-[15px] font-medium leading-5 text-[oklch(var(--accent,0.62_0.16_251.5))] focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {phone.display}
                  </Link>
                ) : null}
                <Link
                  href="/visualizer"
                  className="inline-flex w-full items-center justify-center rounded-[6px] bg-[#0e79eb] px-5 py-3 text-center font-[Mulish,sans-serif] text-[15px] font-medium leading-5 text-white transition-colors duration-200 hover:bg-[#1a6fc9] focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  Get A Free Estimate
                </Link>
              </div>
            </div>
          </details>
        </div>
      </nav>
    </section>
  );
}
