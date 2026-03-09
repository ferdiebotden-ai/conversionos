/**
 * MiscVisualizerTeaser Section — Unit Tests
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

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }: { children: React.ReactNode; href: string }) => <a {...props}>{children}</a>,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => true,
  animate: () => ({ stop: () => {} }),
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

const { MiscVisualizerTeaser } = await import('@/sections/misc/visualizer-teaser');

describe('MiscVisualizerTeaser', () => {
  it('renders the "See It Before You Build It" heading', () => {
    render(
      <MiscVisualizerTeaser
        branding={createMockBranding()}
        config={createMockConfig()}
      />
    );
    expect(screen.getByText('See It Before You Build It')).toBeDefined();
  });

  it('renders the teaser description', () => {
    render(
      <MiscVisualizerTeaser
        branding={createMockBranding()}
        config={createMockConfig()}
      />
    );
    expect(
      screen.getByText(/Upload a photo of your room/)
    ).toBeDefined();
  });

  it('renders the "Try It with Your Space" CTA', () => {
    render(
      <MiscVisualizerTeaser
        branding={createMockBranding()}
        config={createMockConfig()}
      />
    );
    const link = screen.getByText('Try It with Your Space');
    expect(link).toBeDefined();
  });

  it('renders with portfolio images from config', () => {
    render(
      <MiscVisualizerTeaser
        branding={createMockBranding()}
        config={createMockConfig({
          portfolio: [
            { title: 'Kitchen Before', description: '', imageUrl: 'https://example.com/k1.jpg', serviceType: '', location: '' },
            { title: 'Kitchen After', description: '', imageUrl: 'https://example.com/k2.jpg', serviceType: '', location: '' },
            { title: 'Bath After', description: '', imageUrl: 'https://example.com/b1.jpg', serviceType: '', location: '' },
          ],
        })}
      />
    );
    // Should render the teaser with portfolio-derived transformations
    expect(screen.getByText('See It Before You Build It')).toBeDefined();
  });

  it('renders with empty portfolio (falls back to defaults)', () => {
    render(
      <MiscVisualizerTeaser
        branding={createMockBranding()}
        config={createMockConfig({ portfolio: [] })}
      />
    );
    expect(screen.getByText('See It Before You Build It')).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(
      <MiscVisualizerTeaser
        branding={createMockBranding()}
        config={createMockConfig()}
        className="custom-class"
      />
    );
    const section = container.querySelector('section');
    expect(section?.className).toContain('custom-class');
  });
});
