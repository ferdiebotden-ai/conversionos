'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { ExternalLink } from 'lucide-react';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function FooterSimpleCentered({ branding, className }: Props) {
  const year = new Date().getFullYear();

  const navLinks = [
    { label: 'Services', href: '/services' },
    { label: 'Projects', href: '/projects' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <footer className={`bg-muted py-12 ${className ?? ''}`}>
      <div className="mx-auto max-w-4xl px-4 text-center">
        {/* Logo / Name */}
        <div className="flex justify-center">
          {branding.logoUrl ? (
            <Image
              src={branding.logoUrl}
              alt={branding.name}
              width={180}
              height={45}
              className="h-10 w-auto"
            />
          ) : (
            <p className="text-2xl font-bold">{branding.name}</p>
          )}
        </div>

        {/* Nav links */}
        <nav className="mt-6 flex flex-wrap justify-center gap-6 text-sm">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Social links */}
        {branding.socials.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            {branding.socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {s.label}
                <ExternalLink className="size-3" />
              </a>
            ))}
          </div>
        )}

        {/* Copyright */}
        <p className="mt-8 text-xs text-muted-foreground">
          &copy; {year} {branding.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
