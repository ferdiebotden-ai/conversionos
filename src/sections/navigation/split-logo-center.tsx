'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { Button } from '@/components/ui/button';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function SplitLogoCenterNav({ branding, config, className }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const allItems = [
    ...branding.services.slice(0, 4).map(s => ({ label: s.name, href: `/services/${s.slug}` })),
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  const midpoint = Math.ceil(allItems.length / 2);
  const leftItems = allItems.slice(0, midpoint);
  const rightItems = allItems.slice(midpoint);

  return (
    <header className={`sticky top-0 z-50 border-b bg-background/95 backdrop-blur ${className ?? ''}`}>
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Mobile: logo left, hamburger right */}
        <div className="flex w-full items-center justify-between md:hidden">
          <Link href="/" className="flex shrink-0 items-center">
            {config.logoUrl ? (
              <Image src={config.logoUrl} alt={branding.name} width={120} height={32} className="h-8 w-auto" />
            ) : (
              <span className="text-lg font-bold text-foreground">{branding.name}</span>
            )}
          </Link>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="inline-flex items-center justify-center rounded-md p-2 text-foreground"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>

        {/* Desktop: split nav with centred logo */}
        <nav className="hidden w-full items-center justify-center md:flex">
          <div className="flex flex-1 items-center justify-end gap-6">
            {leftItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colours hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <Link href="/" className="mx-8 flex shrink-0 items-center">
            {config.logoUrl ? (
              <Image src={config.logoUrl} alt={branding.name} width={140} height={36} className="h-9 w-auto" />
            ) : (
              <span className="text-xl font-bold text-foreground">{branding.name}</span>
            )}
          </Link>

          <div className="flex flex-1 items-center gap-6">
            {rightItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colours hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t bg-background px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {allItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="text-sm font-medium text-muted-foreground transition-colours hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <Button asChild size="sm" className="mt-2 rounded-full">
              <Link href="/visualizer" onClick={() => setMenuOpen(false)}>
                Start Your Project
              </Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
