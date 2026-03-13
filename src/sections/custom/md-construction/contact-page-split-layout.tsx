'use client';

import Image from 'next/image';
import Link from 'next/link';

import type { SectionBaseProps } from '@/lib/section-types';

type BusinessInfo = {
  phone?: string;
  email?: string;
  address?: string;
  hours?: string;
};

const burgundy = 'oklch(0.47 0.08 18)';
const gold = 'oklch(0.84 0.18 90)';
const ink = 'oklch(0.27 0.02 330)';
const panel = 'oklch(0.97 0.01 85)';
const border = 'oklch(0.79 0.02 244)';

function Icon({ type }: { type: 'phone' | 'email' | 'address' | 'hours' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 shrink-0" style={{ color: burgundy }} aria-hidden="true">
      {type === 'phone' && <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72l.41 2.81a2 2 0 0 1-.57 1.73L7.1 10.1a16 16 0 0 0 6.8 6.8l1.84-1.85a2 2 0 0 1 1.73-.57l2.81.41A2 2 0 0 1 22 16.92Z" />}
      {type === 'email' && <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>}
      {type === 'address' && <><path d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z" /><circle cx="12" cy="11" r="2.5" /></>}
      {type === 'hours' && <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>}
    </svg>
  );
}

const cleanPhone = (value: string) => value.replace(/[^\d+]/g, '');

export function ContactPageSplitLayout({ branding, config, tokens, className }: SectionBaseProps) {
  void tokens;

  const businessInfo = (config as { business_info?: BusinessInfo; city?: string } | null)?.business_info;
  const phone = businessInfo?.phone?.trim();
  const email = businessInfo?.email?.trim();
  const hours = businessInfo?.hours?.trim();
  const address = businessInfo?.address?.trim() || 'Port Stanley, ON';
  const city = ((config as { city?: string } | null)?.city || 'Port Stanley').trim();
  const businessName = branding?.name?.trim() || 'MD Construction';

  if (!phone || !email || !hours) return null;

  const mapPlaceholder = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 520'><rect width='800' height='520' fill='#f7f5f1'/><g stroke='#d8d2c9' stroke-width='2'><path d='M80 120h640M80 260h640M80 400h640'/><path d='M170 70v380M400 70v380M630 70v380'/></g><path d='M400 285c44-57 66-101 66-132 0-37-30-67-66-67s-66 30-66 67c0 31 22 75 66 132Z' fill='#72383f'/><circle cx='400' cy='152' r='22' fill='#fff'/><text x='400' y='470' font-family='Inter, Arial, sans-serif' font-size='32' text-anchor='middle' fill='#272326'>${city}, ON</text></svg>`,
  )}`;

  const details = [
    { label: 'Phone', value: phone, href: `tel:${cleanPhone(phone)}`, type: 'phone' as const },
    { label: 'Email', value: email, href: `mailto:${email}`, type: 'email' as const },
    { label: 'Address', value: address, type: 'address' as const },
    { label: 'Hours', value: hours, type: 'hours' as const },
  ];

  return (
    <section className={`py-[100px] ${className ?? ''}`}>
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-[90px]">
        <div className="grid gap-10 lg:grid-cols-[45%_55%] lg:gap-12">
          <article className="rounded-[4px] p-8 md:p-10" style={{ backgroundColor: panel }}>
            <div className="h-1 w-16 rounded-full" style={{ backgroundColor: gold }} aria-hidden="true" />
            <h2 className="mt-6 font-[Poppins] text-[32px] font-semibold leading-tight md:text-[36px]" style={{ color: ink }}>
              Get in Touch
            </h2>
            <p className="mt-4 max-w-xl font-[Inter] text-base leading-7 text-muted-foreground">
              Reach out to {businessName} for renovation support in {city}. We’re happy to talk through your scope, budget, and next steps.
            </p>

            <nav aria-label="Contact details" className="mt-8 space-y-5">
              {details.map((item) => (
                <div key={item.label} className="flex items-start gap-4">
                  <Icon type={item.type} />
                  <div>
                    <p className="font-[Inter] text-sm font-semibold uppercase tracking-[0.08em]" style={{ color: ink }}>{item.label}</p>
                    {item.href ? (
                      <a href={item.href} className="mt-1 inline-block font-[Inter] text-base text-muted-foreground transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                        {item.value}
                      </a>
                    ) : (
                      <p className="mt-1 font-[Inter] text-base leading-7 text-muted-foreground">{item.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </nav>

            <div className="relative mt-10 overflow-hidden rounded-[4px] border" style={{ borderColor: border }}>
              <div className="relative aspect-[16/10] w-full">
                <Image src={mapPlaceholder} alt={`${businessName} map placeholder for ${city}`} fill unoptimized className="object-cover" />
              </div>
            </div>
          </article>

          <article className="rounded-[4px] bg-white p-8 md:p-10">
            <p className="font-[Inter] text-sm font-semibold uppercase tracking-[0.08em] text-primary">Start Your Project</p>
            <h3 className="mt-3 font-[Poppins] text-[28px] font-semibold leading-tight md:text-[32px]" style={{ color: ink }}>
              Get Your Free Design Estimate
            </h3>
            <p className="mt-4 font-[Inter] text-base leading-7 text-muted-foreground">
              This layout keeps the familiar Gravity Forms look while directing homeowners into the faster ConversionOS estimate flow.
            </p>

            <form action="/api/leads" method="post" className="mt-8 space-y-5">
              <input type="hidden" name="source" value="contact_page" />
              <div>
                <label htmlFor="contact-name" className="mb-2 block font-[Inter] text-sm font-medium" style={{ color: ink }}>Full Name</label>
                <input id="contact-name" name="name" type="text" placeholder="Your name" readOnly aria-readonly="true" className="w-full rounded-[4px] border px-4 py-4 font-[Inter] text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" style={{ borderColor: border, color: ink }} />
              </div>
              <div>
                <label htmlFor="contact-email" className="mb-2 block font-[Inter] text-sm font-medium" style={{ color: ink }}>Email Address</label>
                <input id="contact-email" name="email" type="email" placeholder="you@example.com" readOnly aria-readonly="true" className="w-full rounded-[4px] border px-4 py-4 font-[Inter] text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" style={{ borderColor: border, color: ink }} />
              </div>
              <div>
                <label htmlFor="contact-message" className="mb-2 block font-[Inter] text-sm font-medium" style={{ color: ink }}>Project Details</label>
                <textarea id="contact-message" name="message" rows={6} placeholder="Tell us about your renovation goals" readOnly aria-readonly="true" className="w-full rounded-[4px] border px-4 py-4 font-[Inter] text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" style={{ borderColor: border, color: ink }} />
              </div>
              <Link href="/visualizer" className="inline-flex w-full items-center justify-center rounded-[4px] px-6 py-4 text-center font-[Inter] text-[18px] font-semibold text-white transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" style={{ backgroundColor: burgundy }}>
                Get Your Free Design Estimate
              </Link>
              <p className="font-[Inter] text-sm leading-6 text-muted-foreground">
                Prefer to talk first? Call <a href={`tel:${cleanPhone(phone)}`} className="font-semibold underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-primary" style={{ color: burgundy }}>{phone}</a>.
              </p>
            </form>
          </article>
        </div>

        <footer className="mt-8 text-center font-[Inter] text-sm text-muted-foreground">
          Serving homeowners across {city} and surrounding communities.
        </footer>
      </div>
    </section>
  );
}
