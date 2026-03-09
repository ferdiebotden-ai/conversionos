/**
 * TrustBadgeStrip Section — Unit Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Branding } from '@/lib/branding';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';

vi.mock('@/components/motion', () => ({
  FadeInUp: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  FadeIn: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  StaggerContainer: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  StaggerItem: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
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
    aboutCopy: [],
    mission: '',
    services: [],
    heroHeadline: '',
    heroSubheadline: '',
    heroImageUrl: '',
    aboutImageUrl: '',
    logoUrl: '',
    trustBadges: [],
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

const { TrustBadgeStrip } = await import('@/sections/trust/badge-strip');

describe('TrustBadgeStrip', () => {
  // Note: TrustBadgeStrip renders both desktop (sm:flex) and mobile (sm:hidden)
  // layouts side-by-side. In jsdom both are visible, so we use getAllByText.

  it('renders Google rating when present', () => {
    render(
      <TrustBadgeStrip
        branding={createMockBranding()}
        config={createMockConfig({
          trustMetrics: { google_rating: '4.8' },
        })}
      />
    );
    expect(screen.getAllByText('4.8').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Google Rating').length).toBeGreaterThanOrEqual(1);
  });

  it('renders years in business with correct suffix', () => {
    render(
      <TrustBadgeStrip
        branding={createMockBranding()}
        config={createMockConfig({
          trustMetrics: { years_in_business: '15' },
        })}
      />
    );
    expect(screen.getAllByText('15 Years').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('In Business').length).toBeGreaterThanOrEqual(1);
  });

  it('renders "1 Year" (not "1+ Years") for a single year', () => {
    render(
      <TrustBadgeStrip
        branding={createMockBranding()}
        config={createMockConfig({
          trustMetrics: { years_in_business: '1' },
        })}
      />
    );
    expect(screen.getAllByText('1 Year').length).toBeGreaterThanOrEqual(1);
  });

  it('renders projects completed', () => {
    render(
      <TrustBadgeStrip
        branding={createMockBranding()}
        config={createMockConfig({
          trustMetrics: { projects_completed: '200+' },
        })}
      />
    );
    expect(screen.getAllByText('200+').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Projects').length).toBeGreaterThanOrEqual(1);
  });

  it('renders licensed and insured badge', () => {
    render(
      <TrustBadgeStrip
        branding={createMockBranding()}
        config={createMockConfig({
          trustMetrics: { licensed_insured: true },
        })}
      />
    );
    expect(screen.getAllByText('Licensed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('& Insured').length).toBeGreaterThanOrEqual(1);
  });

  it('returns null when trustMetrics is undefined', () => {
    const config = createMockConfig();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (config as any).trustMetrics = undefined;
    const { container } = render(
      <TrustBadgeStrip branding={createMockBranding()} config={config} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('returns null when all trustMetrics fields are empty', () => {
    const { container } = render(
      <TrustBadgeStrip
        branding={createMockBranding()}
        config={createMockConfig({
          trustMetrics: {},
        })}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders all four metrics when all are provided', () => {
    render(
      <TrustBadgeStrip
        branding={createMockBranding()}
        config={createMockConfig({
          trustMetrics: {
            google_rating: '5.0',
            years_in_business: '20',
            projects_completed: '500+',
            licensed_insured: true,
          },
        })}
      />
    );
    expect(screen.getAllByText('5.0').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('20 Years').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('500+').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Licensed').length).toBeGreaterThanOrEqual(1);
  });
});
