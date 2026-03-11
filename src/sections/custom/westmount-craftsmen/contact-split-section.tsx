'use client';

import Image from 'next/image';
import Link from 'next/link';

import type { SectionBaseProps } from '@/lib/section-types';

type SocialLink = {
  label: string;
  href: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

const socialIconMap: Record<string, string> = {
  facebook: 'M15.12 5.32h2.75V.23C17.4.16 16.01 0 14.39 0 11 0 8.67 2.13 8.67 6.04v4.48H5v5.7h3.67V24h6.03v-7.78h4.71l.75-5.7h-5.46V6.6c0-1.65.45-2.78 2.42-2.78Z',
  instagram: 'M12 2.16c3.2 0 3.58.01 4.84.07 3.24.15 4.75 1.69 4.9 4.9.06 1.26.07 1.64.07 4.84 0 3.2-.01 3.58-.07 4.84-.15 3.21-1.66 4.75-4.9 4.9-1.26.06-1.64.07-4.84.07-3.2 0-3.58-.01-4.84-.07-3.25-.15-4.75-1.69-4.9-4.9C2.17 15.58 2.16 15.2 2.16 12c0-3.2.01-3.58.07-4.84.15-3.21 1.65-4.75 4.9-4.9C8.42 2.17 8.8 2.16 12 2.16Zm0-2.16C8.74 0 8.33.01 7.03.07 2.7.27.27 2.7.07 7.03.01 8.33 0 8.74 0 12s.01 3.67.07 4.97c.2 4.33 2.63 6.76 6.96 6.96 1.3.06 1.71.07 4.97.07s3.67-.01 4.97-.07c4.32-.2 6.76-2.63 6.96-6.96.06-1.3.07-1.71.07-4.97s-.01-3.67-.07-4.97C23.73 2.7 21.29.27 16.97.07 15.67.01 15.26 0 12 0Zm0 5.84A6.16 6.16 0 1 0 12 18.16 6.16 6.16 0 0 0 12 5.84Zm0 10.16A4 4 0 1 1 12 8a4 4 0 0 1 0 8Zm6.41-10.85a1.44 1.44 0 1 1-1.44-1.44 1.44 1.44 0 0 1 1.44 1.44Z',
  linkedin: 'M4.98 3.5A2.49 2.49 0 1 1 5 8.48 2.49 2.49 0 0 1 4.98 3.5ZM.5 8.99h4.96V24H.5V8.99ZM8.58 8.99h4.75v2.05h.07c.66-1.25 2.28-2.57 4.69-2.57 5.01 0 5.93 3.3 5.93 7.58V24h-4.96v-6.98c0-1.66-.03-3.8-2.31-3.8-2.32 0-2.68 1.81-2.68 3.68V24H8.58V8.99Z',
  x: 'M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-7.39L5.6 22H2.5l7.24-8.27L1.8 2h6.4l4.42 6.71L18.9 2Zm-1.09 18h1.72L7.27 3.9H5.43l12.38 16.1Z',
  youtube: 'M23.5 6.2a3.02 3.02 0 0 0-2.13-2.13C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.37.57A3.02 3.02 0 0 0 .5 6.2 31.8 31.8 0 0 0 0 12a31.8 31.8 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.13 2.13C4.5 20.5 12 20.5 12 20.5s7.5 0 9.37-.57a3.02 3.02 0 0 0 2.13-2.13A31.8 31.8 0 0 0 24 12a31.8 31.8 0 0 0-.5-5.8ZM9.6 15.57V8.43L15.82 12 9.6 15.57Z',
};

function DetailIcon({ path }: { path: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-[oklch(var(--accent))]">
      <path d={path} />
    </svg>
  );
}

function SocialIcon({ name }: { name: string }) {
  const path = socialIconMap[name.toLowerCase()];
  if (!path) return null;

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d={path} />
    </svg>
  );
}

export function ContactSplitSection({ branding, config, tokens, className }: SectionBaseProps) {
  const configRecord = asRecord(config);
  const businessInfo = asRecord(configRecord?.['business_info']);
  const companyProfile = asRecord(configRecord?.['company_profile']);

  const phone = typeof businessInfo?.['phone'] === 'string' ? businessInfo['phone'] : config.phone;
  const email = typeof businessInfo?.['email'] === 'string' ? businessInfo['email'] : config.email;
  const address = typeof businessInfo?.['address'] === 'string' ? businessInfo['address'] : config.address;
  const hours = typeof businessInfo?.['hours'] === 'string' ? businessInfo['hours'] : config.hours;
  const socialLinksRaw = companyProfile?.['social_links'];

  const socialLinks = Array.isArray(socialLinksRaw)
    ? (socialLinksRaw.filter(
        (item): item is SocialLink =>
          !!item &&
          typeof item === 'object' &&
          typeof (item as SocialLink).label === 'string' &&
          typeof (item as SocialLink).href === 'string',
      ) as SocialLink[])
    : [];

  if (!phone && !email && !address && !hours) return null;

  const details = [
    { label: 'Phone', value: phone, href: `tel:${phone.replace(/[^+\d]/g, '')}`, path: 'M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20a1 1 0 0 1-1 1C10.4 21 3 13.6 3 4a1 1 0 0 1 1-1h3.49c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.19 2.2Z' },
    { label: 'Email', value: email, href: `mailto:${email}`, path: 'M20 4H4a2 2 0 0 0-2 2v.4l10 5.56 10-5.56V6a2 2 0 0 0-2-2Zm2 4.67-9.51 5.28a1 1 0 0 1-.98 0L2 8.67V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8.67Z' },
    { label: 'Address', value: address, href: undefined, path: 'M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z' },
    { label: 'Hours', value: hours, href: undefined, path: 'M12 1.75A10.25 10.25 0 1 0 22.25 12 10.26 10.26 0 0 0 12 1.75Zm3.82 14.07a1 1 0 0 1-1.41 0l-3.12-3.12a1 1 0 0 1-.29-.71V6.75a1 1 0 1 1 2 0v4.84l2.82 2.82a1 1 0 0 1 0 1.41Z' },
  ].filter((item) => item.value);

  return (
    <section className={`bg-white py-20 ${className ?? ''}`}>
      <div className="mx-auto grid max-w-6xl gap-12 px-4 md:grid-cols-[minmax(0,1.22fr)_minmax(0,1fr)] md:items-start md:gap-16">
        <article>
          <header>
            <h2 className="font-[Raleway,sans-serif] text-[24px] font-bold text-[oklch(var(--contrast-2))]">
              Get In Touch
            </h2>
          </header>

          <div className="mt-8 space-y-5">
            {details.map((detail) => {
              const content = (
                <>
                  <DetailIcon path={detail.path} />
                  <div>
                    <p className="font-[Mulish,sans-serif] text-[16px] font-semibold text-[oklch(var(--contrast-2))]">
                      {detail.label}
                    </p>
                    <p className="font-[Mulish,sans-serif] text-[16px] font-normal leading-7 text-[oklch(var(--contrast-3))]">
                      {detail.value}
                    </p>
                  </div>
                </>
              );

              return detail.href ? (
                <Link
                  key={detail.label}
                  href={detail.href}
                  className="flex items-start gap-4 rounded-md transition-colors hover:text-[oklch(var(--primary))] focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {content}
                </Link>
              ) : (
                <div key={detail.label} className="flex items-start gap-4">
                  {content}
                </div>
              );
            })}
          </div>

          {socialLinks.length > 0 ? (
            <footer className="mt-8">
              <nav aria-label="Social media" className="flex flex-wrap gap-3">
                {socialLinks.map((social) => {
                  const label = social.label.trim();

                  return (
                    <Link
                      key={`${label}-${social.href}`}
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={label}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-[oklch(var(--accent)/0.2)] text-[oklch(var(--accent))] transition-colors hover:bg-[oklch(var(--accent)/0.08)] focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <SocialIcon name={label} />
                    </Link>
                  );
                })}
              </nav>
            </footer>
          ) : null}
        </article>

        <article className="rounded-[6px] bg-[oklch(var(--base))] p-8 md:p-10">
          <div className="mb-6 overflow-hidden rounded-[6px] border border-[oklch(var(--contrast-2)/0.08)]">
            <Image
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='700' viewBox='0 0 1200 700'%3E%3Crect width='1200' height='700' fill='%23f2f6fb'/%3E%3Cg stroke='%231a6fc9' stroke-width='2' fill='none' opacity='.3'%3E%3Cpath d='M0 110h1200M0 230h1200M0 350h1200M0 470h1200M0 590h1200'/%3E%3Cpath d='M120 0v700M320 0v700M520 0v700M720 0v700M920 0v700M1120 0v700'/%3E%3C/g%3E%3Cg fill='%231a6fc9'%3E%3Ccircle cx='600' cy='320' r='28'/%3E%3Cpath d='M600 390c50-63 76-108 76-141a76 76 0 1 0-152 0c0 33 26 78 76 141Z' opacity='.75'/%3E%3C/g%3E%3C/svg%3E"
              alt={`${branding?.name ?? 'Company'} service area map preview`}
              width={1200}
              height={700}
              className="h-auto w-full object-cover"
            />
          </div>

          <h3 className="font-[Raleway,sans-serif] text-[20px] font-bold text-[oklch(var(--contrast-2))]">
            Ready to Start?
          </h3>
          <p className="mt-4 font-[Mulish,sans-serif] text-[16px] font-normal leading-7 text-[oklch(var(--contrast-3))]">
            Tell us about your renovation goals and explore ideas with our visualizer before we connect.
          </p>
          <div className="mt-8 space-y-4">
            <Link
              href="/visualizer"
              className="block w-full rounded-[6px] bg-[#0e79eb] px-6 py-4 text-center font-[Mulish,sans-serif] text-[16px] font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              Start Your Project
            </Link>
            <Link
              href="/visualizer"
              className="block text-center font-[Mulish,sans-serif] text-[16px] font-medium text-[oklch(var(--primary))] underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-primary"
            >
              Get Your Free Design Estimate
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
