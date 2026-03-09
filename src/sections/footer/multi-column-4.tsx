'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { Phone, Mail, ExternalLink } from 'lucide-react';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function FooterMultiColumn4({ branding, className }: Props) {
  const year = new Date().getFullYear();

  return (
    <footer className={`bg-foreground text-background ${className ?? ''}`}>
      <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Brand */}
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
          </div>

          {/* Column 2: Services */}
          <div>
            <h4 className="font-semibold">Services</h4>
            <ul className="mt-4 space-y-2 text-sm">
              {branding.services.map((svc) => (
                <li key={svc.slug}>
                  <Link
                    href={`/services/${svc.slug}`}
                    className="text-background/70 transition-colors hover:text-background"
                  >
                    {svc.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Company */}
          <div>
            <h4 className="font-semibold">Company</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-background/70 transition-colors hover:text-background">
                  About
                </Link>
              </li>
              <li>
                <Link href="/projects" className="text-background/70 transition-colors hover:text-background">
                  Projects
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-background/70 transition-colors hover:text-background">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-background/70 transition-colors hover:text-background">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-background/70 transition-colors hover:text-background">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Connect */}
          <div>
            <h4 className="font-semibold">Connect</h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-background/60" />
                <a href={`tel:${branding.phone}`} className="text-background/70 hover:text-background">
                  {branding.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="size-4 shrink-0 text-background/60" />
                <a href={`mailto:${branding.email}`} className="text-background/70 hover:text-background">
                  {branding.email}
                </a>
              </li>
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
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-background/50 sm:flex-row">
          <span>&copy; {year} {branding.name}. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-background/70">Privacy</Link>
            <Link href="/terms" className="hover:text-background/70">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
