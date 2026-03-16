'use client';

import Link from 'next/link';
import type { SectionBaseProps } from '@/lib/section-types';

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

export function ContactSplit({ config, className }: SectionBaseProps) {
  const c = (config ?? {}) as Record<string, unknown>;
  const phone = str(c['phone']);
  const email = str(c['email']);
  const address = str(c['address']);
  const city = str(c['city']);
  const province = str(c['province']);

  return (
    <section className={`bg-[rgb(248,247,245)] py-20 ${className ?? ''}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2">
          {/* Left: Contact Info */}
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
              Get In Touch
            </p>
            <h2 className="mb-6 font-[Anton] text-4xl uppercase text-gray-900">
              Contact Us
            </h2>
            <p className="mb-8 text-base leading-relaxed text-gray-600">
              Ready to start your renovation project? Get in touch with our team for a free consultation and quote.
            </p>

            <div className="space-y-5">
              {phone && (
                <div className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phone</p>
                    <a href={`tel:${phone.replace(/[^0-9]/g, '')}`} className="text-lg font-semibold text-gray-900 hover:text-primary">
                      {phone}
                    </a>
                  </div>
                </div>
              )}
              {email && (
                <div className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <a href={`mailto:${email}`} className="text-lg font-semibold text-gray-900 hover:text-primary">
                      {email}
                    </a>
                  </div>
                </div>
              )}
              {(address || city) && (
                <div className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Location</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {[address, city, province].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: CTA Card */}
          <div className="flex flex-col justify-center rounded-lg bg-primary p-10 text-white">
            <h3 className="mb-4 font-[Anton] text-3xl uppercase">
              Start Your Project Today
            </h3>
            <p className="mb-8 text-white/80">
              Use our AI Design Studio to visualize your renovation before committing. Upload a photo, pick a style, and see the transformation instantly.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/visualizer"
                className="inline-flex items-center justify-center rounded bg-white px-6 py-3 text-sm font-semibold text-primary transition hover:bg-white/90"
              >
                Try the Design Studio
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded border-2 border-white px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Request a Quote
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
