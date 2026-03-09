/**
 * CTAFullWidthPrimary Section — Unit Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TierProvider } from '@/components/tier-provider';
import type { Branding } from '@/lib/branding';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';

vi.mock('@/components/motion', () => ({
  FadeInUp: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  FadeIn: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  StaggerContainer: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  StaggerItem: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }: { children: React.ReactNode; href: string }) => <a {...props}>{children}</a>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ComponentProps<'button'> & { asChild?: boolean; variant?: string }) => {
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
    trustMetrics: {},
    ...overrides,
  };
}

const { CTAFullWidthPrimary } = await import('@/sections/cta/full-width-primary');

describe('CTAFullWidthPrimary', () => {
  it('renders the "Ready to See Your Renovation?" heading', () => {
    render(
      <TierProvider tier="accelerate">
        <CTAFullWidthPrimary
          branding={createMockBranding()}
          config={createMockConfig()}
        />
      </TierProvider>
    );
    expect(screen.getByText('Ready to See Your Renovation?')).toBeDefined();
  });

  it('renders the description text', () => {
    render(
      <TierProvider tier="accelerate">
        <CTAFullWidthPrimary
          branding={createMockBranding()}
          config={createMockConfig()}
        />
      </TierProvider>
    );
    expect(
      screen.getByText(/Upload a photo of your space and get AI-generated design concepts/)
    ).toBeDefined();
  });

  it('includes branding name in the description', () => {
    render(
      <TierProvider tier="accelerate">
        <CTAFullWidthPrimary
          branding={createMockBranding({ name: 'Acme Renos' })}
          config={createMockConfig()}
        />
      </TierProvider>
    );
    expect(screen.getByText(/Acme Renos makes it easy/)).toBeDefined();
  });

  it('renders "Start Your Project" for accelerate tier', () => {
    render(
      <TierProvider tier="accelerate">
        <CTAFullWidthPrimary
          branding={createMockBranding()}
          config={createMockConfig()}
        />
      </TierProvider>
    );
    const link = screen.getByText('Start Your Project');
    expect(link).toBeDefined();
    expect(link.closest('a')?.getAttribute('href')).toBe('/visualizer');
  });

  it('renders "Request a Free Estimate" for accelerate tier', () => {
    render(
      <TierProvider tier="accelerate">
        <CTAFullWidthPrimary
          branding={createMockBranding()}
          config={createMockConfig()}
        />
      </TierProvider>
    );
    const link = screen.getByText('Request a Free Estimate');
    expect(link).toBeDefined();
    expect(link.closest('a')?.getAttribute('href')).toBe('/visualizer?mode=chat');
  });

  it('renders "Contact Us" link for elevate tier', () => {
    render(
      <TierProvider tier="elevate">
        <CTAFullWidthPrimary
          branding={createMockBranding()}
          config={createMockConfig()}
        />
      </TierProvider>
    );
    const link = screen.getByText('Contact Us');
    expect(link).toBeDefined();
    expect(link.closest('a')?.getAttribute('href')).toBe('/contact');
  });

  it('applies custom className', () => {
    const { container } = render(
      <TierProvider tier="accelerate">
        <CTAFullWidthPrimary
          branding={createMockBranding()}
          config={createMockConfig()}
          className="test-class"
        />
      </TierProvider>
    );
    const section = container.querySelector('section');
    expect(section?.className).toContain('test-class');
  });

  it('handles empty branding name gracefully', () => {
    render(
      <TierProvider tier="accelerate">
        <CTAFullWidthPrimary
          branding={createMockBranding({ name: '' })}
          config={createMockConfig()}
        />
      </TierProvider>
    );
    expect(screen.getByText('Ready to See Your Renovation?')).toBeDefined();
    const desc = screen.getByText(/Upload a photo of your space/);
    expect(desc.textContent).not.toContain('makes it easy');
  });
});
