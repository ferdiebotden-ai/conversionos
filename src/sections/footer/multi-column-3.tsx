'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { Phone, Mail, MapPin, ExternalLink } from 'lucide-react';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function FooterMultiColumn3({ branding, config, className }: Props) {
  const year = new Date().getFullYear();

  return (
    <footer className={`bg-foreground text-background ${className ?? ''}`}>
      <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Column 1: Company info */}
          <div>
            {branding.logoUrl ? (
              <Image
                src={branding.logoUrl}
                alt={branding.name}
                width={200}
                height={50}
                className="h-10 w-auto brightness-0 invert"
              />
            ) : (
              <p className="text-2xl font-bold">{branding.name}</p>
            )}
            <p className="mt-3 text-sm text-background/70">{branding.tagline}</p>
            {config.aboutCopy[0] && (
              <p className="mt-3 text-sm text-background/60 line-clamp-3">
                {config.aboutCopy[0]}
              </p>
            )}
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="font-semibold">Quick Links</h4>
            <ul className="mt-4 space-y-2 text-sm">
              {branding.services.slice(0, 5).map((svc) => (
                <li key={svc.slug}>
                  <Link
                    href={`/services/${svc.slug}`}
                    className="text-background/70 transition-colors hover:text-background"
                  >
                    {svc.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/about" className="text-background/70 transition-colors hover:text-background">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-background/70 transition-colors hover:text-background">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div>
            <h4 className="font-semibold">Contact</h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 size-4 shrink-0 text-background/60" />
                <a href={`tel:${branding.phone}`} className="text-background/70 hover:text-background">
                  {branding.phone}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 size-4 shrink-0 text-background/60" />
                <a href={`mailto:${branding.email}`} className="text-background/70 hover:text-background">
                  {branding.email}
                </a>
              </li>
              {branding.address && (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-background/60" />
                  <span className="text-background/70">
                    {branding.address}, {branding.city}, {branding.province} {branding.postal}
                  </span>
                </li>
              )}
            </ul>
            {branding.socials.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {branding.socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-background/60 transition-colors hover:text-background"
                  >
                    {s.label}
                    <ExternalLink className="size-3" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-background/10">
        <div className="mx-auto max-w-6xl px-4 py-4 text-centre text-xs text-background/50">
          &copy; {year} {branding.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
