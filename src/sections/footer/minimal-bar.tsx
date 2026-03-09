'use client';

import Link from 'next/link';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function FooterMinimalBar({ branding, className }: Props) {
  const year = new Date().getFullYear();

  return (
    <footer className={`border-t ${className ?? ''}`}>
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-sm text-muted-foreground sm:flex-row">
        <span>&copy; {year} {branding.name}</span>
        <nav className="flex flex-wrap gap-4">
          <Link href="/about" className="transition-colors hover:text-foreground">About</Link>
          <Link href="/contact" className="transition-colors hover:text-foreground">Contact</Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
        </nav>
      </div>
    </footer>
  );
}
