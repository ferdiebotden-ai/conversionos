'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, Phone, X } from 'lucide-react';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { Button } from '@/components/ui/button';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function HamburgerNav({ branding, config, className }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { label: 'Home', href: '/' },
    ...branding.services.slice(0, 4).map(s => ({ label: s.name, href: `/services/${s.slug}` })),
    { label: 'Projects', href: '/projects' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <header className={`sticky top-0 z-50 border-b bg-background/95 backdrop-blur ${className ?? ''}`}>
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center">
          {config.logoUrl ? (
            <Image src={config.logoUrl} alt={branding.name} width={140} height={36} className="h-9 w-auto" />
          ) : (
            <span className="text-xl font-bold text-foreground">{branding.name}</span>
          )}
        </Link>

        {/* Phone + hamburger */}
        <div className="flex items-center gap-3">
          {branding.phone && (
            <a
              href={`tel:${branding.phone.replace(/\D/g, '')}`}
              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colours hover:text-foreground"
              aria-label={`Call ${branding.phone}`}
            >
              <Phone className="size-4" />
              <span className="hidden sm:inline">{branding.phone}</span>
            </a>
          )}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="inline-flex items-center justify-center rounded-md p-2 text-foreground"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {/* Slide-out panel */}
      {menuOpen && (
        <div className="border-t bg-background px-4 py-6">
          <nav className="flex flex-col gap-4">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="text-base font-medium text-muted-foreground transition-colours hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-4 border-t pt-4">
              <Button asChild className="w-full rounded-full">
                <Link href="/visualizer" onClick={() => setMenuOpen(false)}>
                  Start Your Project
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
