'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { Button } from '@/components/ui/button';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function StickyTransparentNav({ branding, config, className }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    ...branding.services.slice(0, 4).map(s => ({ label: s.name, href: `/services/${s.slug}` })),
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b bg-background/95 backdrop-blur'
          : 'bg-transparent'
      } ${className ?? ''}`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          {config.logoUrl ? (
            <Image
              src={config.logoUrl}
              alt={branding.name}
              width={140}
              height={36}
              className={`h-9 w-auto transition-all duration-300 ${scrolled ? '' : 'brightness-0 invert'}`}
            />
          ) : (
            <span className={`text-xl font-bold transition-colours duration-300 ${scrolled ? 'text-foreground' : 'text-white'}`}>
              {branding.name}
            </span>
          )}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition-colours duration-300 ${
                scrolled
                  ? 'text-muted-foreground hover:text-foreground'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:block">
          <Button
            asChild
            size="sm"
            className="rounded-full"
            variant={scrolled ? 'default' : 'secondary'}
          >
            <Link href="/visualizer">Start Your Project</Link>
          </Button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`inline-flex items-center justify-center rounded-md p-2 md:hidden ${
            scrolled ? 'text-foreground' : 'text-white'
          }`}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t bg-background px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {navItems.map(item => (
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
