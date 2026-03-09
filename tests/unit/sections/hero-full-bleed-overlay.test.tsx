/**
 * FullBleedOverlayHero Section — Unit Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Branding } from '@/lib/branding';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';

// Mock motion wrappers
vi.mock('@/components/motion', () => ({
  FadeInUp: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  FadeIn: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  StaggerContainer: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  StaggerItem: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }: { children: React.ReactNode; href: string }) => <a {...props}>{children}</a>,
}));

vi.mock('@/components/home/aurora-background', () => ({
  AuroraBackground: () => <div data-testid="aurora-background" />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ComponentProps<'button'> & { asChild?: boolean }) => {
    if (props.asChild) {
      return <>{children}</>;
    }
    return <button {...props}>{children}</button>;
  },
}));

function createMockBranding(overrides: Partial<Branding> = {}): Branding {
  return {
    name: 'Test Reno Co',
    tagline: 'Quality Renovations',
    phone: '(555) 123-4567',
    email: 'test@example.com',
    website: 'test.norbotsystems.com',
    address: '123 Test St',
    city: 'Toronto',
    province: 'ON',
    postal: 'M1M 1M1',
    socials: [],
    paymentEmail: 'pay@example.com',
    quotesEmail: 'quotes@example.com',
    primaryColor: '#0D9488',
    primaryOklch: '0.588 0.108 180',
    services: [],
    ...overrides,
  };
}

function createMockConfig(overrides: Partial<CompanyConfig> = {}): CompanyConfig {
  return {
    name: 'Test Reno Co',
    location: 'Toronto, ON, Canada',
    phone: '(555) 123-4567',
    email: 'test@example.com',
    website: 'test.norbotsystems.com',
    principals: 'John Doe',
    tagline: 'Quality Renovations',
    founded: '2020',
    booking: '',
    serviceArea: 'Greater Toronto Area',
    certifications: [],
    socials: [],
    paymentEmail: 'pay@example.com',
    quotesEmail: 'quotes@example.com',
    address: '123 Test St',
    city: 'Toronto',
    province: 'ON',
    postal: 'M1M 1M1',
    hours: 'Mon-Fri 9am-5pm',
    primaryColor: '#0D9488',
    primaryOklch: '0.588 0.108 180',
    testimonials: [],
    aboutCopy: ['We are a renovation company.'],
    mission: 'Great renovations.',
    services: [
      { name: 'Kitchen Renovation', slug: 'kitchen-renovation', description: 'Kitchen renos.' },
    ],
    heroHeadline: 'Transform Your Home',
    heroSubheadline: 'Professional renovations in Toronto.',
    heroImageUrl: 'https://example.com/hero.jpg',
    aboutImageUrl: '',
    logoUrl: '/logo.svg',
    trustBadges: [
      { label: 'Licensed', iconHint: 'shield' },
      { label: 'Insured', iconHint: 'award' },
    ],
    whyChooseUs: [],
    values: [],
    processSteps: [],
    teamMembers: [],
    portfolio: [],
    trustMetrics: {
      google_rating: '4.9',
      projects_completed: '50+',
      years_in_business: '10',
      licensed_insured: true,
    },
    ...overrides,
  };
}

// Dynamic import to ensure mocks are applied first
const { FullBleedOverlayHero } = await import('@/sections/hero/full-bleed-overlay');

describe('FullBleedOverlayHero', () => {
  it('renders the hero headline from config', () => {
    render(
      <FullBleedOverlayHero
        branding={createMockBranding()}
        config={createMockConfig({ heroHeadline: 'Build Your Dream Home' })}
      />
    );
    expect(screen.getByText('Build Your Dream Home')).toBeDefined();
  });

  it('falls back to branding tagline when heroHeadline is empty', () => {
    render(
      <FullBleedOverlayHero
        branding={createMockBranding({ tagline: 'Best Renos in Town' })}
        config={createMockConfig({ heroHeadline: '' })}
      />
    );
    expect(screen.getByText('Best Renos in Town')).toBeDefined();
  });

  it('renders hero subheadline from config', () => {
    render(
      <FullBleedOverlayHero
        branding={createMockBranding()}
        config={createMockConfig({ heroSubheadline: 'Expert craftsmanship since 2005.' })}
      />
    );
    expect(screen.getByText('Expert craftsmanship since 2005.')).toBeDefined();
  });

  it('renders hero image when heroImageUrl is provided', () => {
    render(
      <FullBleedOverlayHero
        branding={createMockBranding()}
        config={createMockConfig({ heroImageUrl: 'https://example.com/hero.jpg' })}
      />
    );
    const img = screen.getByAltText('Test Reno Co — Transform Your Home');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('https://example.com/hero.jpg');
  });

  it('renders AuroraBackground when heroImageUrl is empty', () => {
    render(
      <FullBleedOverlayHero
        branding={createMockBranding()}
        config={createMockConfig({ heroImageUrl: '' })}
      />
    );
    expect(screen.getByTestId('aurora-background')).toBeDefined();
  });

  it('renders phone link when branding.phone is set', () => {
    render(
      <FullBleedOverlayHero
        branding={createMockBranding({ phone: '(416) 555-1234' })}
        config={createMockConfig()}
      />
    );
    expect(screen.getByText('(416) 555-1234')).toBeDefined();
  });

  it('does not render phone link when phone is empty', () => {
    render(
      <FullBleedOverlayHero
        branding={createMockBranding({ phone: '' })}
        config={createMockConfig()}
      />
    );
    expect(screen.queryByText(/\(\d+\)/)).toBeNull();
  });

  it('renders trust badges from config.trustBadges', () => {
    render(
      <FullBleedOverlayHero
        branding={createMockBranding()}
        config={createMockConfig({
          trustBadges: [
            { label: 'Ontario-Based', iconHint: 'map-pin' },
            { label: 'AI-Powered', iconHint: 'sparkles' },
          ],
        })}
      />
    );
    expect(screen.getByText('Ontario-Based')).toBeDefined();
    expect(screen.getByText('AI-Powered')).toBeDefined();
  });

  it('falls back to certifications when trustBadges is empty', () => {
    render(
      <FullBleedOverlayHero
        branding={createMockBranding()}
        config={createMockConfig({
          trustBadges: [],
          certifications: ['RenoMark', 'BBB A+'],
        })}
      />
    );
    expect(screen.getByText('RenoMark')).toBeDefined();
    expect(screen.getByText('BBB A+')).toBeDefined();
  });

  it('renders the "Visualise Your Dream Space" CTA link', () => {
    render(
      <FullBleedOverlayHero
        branding={createMockBranding()}
        config={createMockConfig()}
      />
    );
    const link = screen.getByText('Visualise Your Dream Space');
    expect(link).toBeDefined();
    expect(link.closest('a')?.getAttribute('href')).toBe('/visualizer');
  });

  it('renders at most 3 badges', () => {
    render(
      <FullBleedOverlayHero
        branding={createMockBranding()}
        config={createMockConfig({
          trustBadges: [
            { label: 'Badge1', iconHint: 'shield' },
            { label: 'Badge2', iconHint: 'shield' },
            { label: 'Badge3', iconHint: 'shield' },
            { label: 'Badge4', iconHint: 'shield' },
          ],
        })}
      />
    );
    expect(screen.getByText('Badge1')).toBeDefined();
    expect(screen.getByText('Badge2')).toBeDefined();
    expect(screen.getByText('Badge3')).toBeDefined();
    expect(screen.queryByText('Badge4')).toBeNull();
  });
});
