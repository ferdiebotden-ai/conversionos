/**
 * ServicesGrid3Cards Section — Unit Tests
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

const { ServicesGrid3Cards } = await import('@/sections/services/grid-3-cards');

describe('ServicesGrid3Cards', () => {
  it('renders the "Our Services" heading', () => {
    render(
      <ServicesGrid3Cards
        branding={createMockBranding()}
        config={createMockConfig({
          services: [
            { name: 'Kitchens', slug: 'kitchens', description: 'Kitchen renovations.' },
          ],
        })}
      />
    );
    expect(screen.getByText('Our Services')).toBeDefined();
  });

  it('renders service cards with name and description', () => {
    render(
      <ServicesGrid3Cards
        branding={createMockBranding()}
        config={createMockConfig({
          services: [
            { name: 'Kitchens', slug: 'kitchens', description: 'Full kitchen renovations.' },
            { name: 'Bathrooms', slug: 'bathrooms', description: 'Bathroom transformations.' },
          ],
        })}
      />
    );
    expect(screen.getByText('Kitchens')).toBeDefined();
    expect(screen.getByText('Full kitchen renovations.')).toBeDefined();
    expect(screen.getByText('Bathrooms')).toBeDefined();
    expect(screen.getByText('Bathroom transformations.')).toBeDefined();
  });

  it('links each service card to its slug', () => {
    render(
      <ServicesGrid3Cards
        branding={createMockBranding()}
        config={createMockConfig({
          services: [
            { name: 'Kitchens', slug: 'kitchens', description: 'Kitchen renovations.' },
          ],
        })}
      />
    );
    const link = screen.getByText('Kitchens').closest('a');
    expect(link?.getAttribute('href')).toBe('/services/kitchens');
  });

  it('renders service image when imageUrl is provided', () => {
    render(
      <ServicesGrid3Cards
        branding={createMockBranding()}
        config={createMockConfig({
          services: [
            { name: 'Kitchens', slug: 'kitchens', description: 'Renos.', imageUrl: 'https://example.com/kitchen.jpg' },
          ],
        })}
      />
    );
    const img = screen.getByAltText('Kitchens');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('https://example.com/kitchen.jpg');
  });

  it('renders "Learn More" text on each card', () => {
    render(
      <ServicesGrid3Cards
        branding={createMockBranding()}
        config={createMockConfig({
          services: [
            { name: 'Kitchens', slug: 'kitchens', description: 'Renos.' },
            { name: 'Bathrooms', slug: 'bathrooms', description: 'Bath renos.' },
          ],
        })}
      />
    );
    const learnMoreElements = screen.getAllByText(/Learn More/);
    expect(learnMoreElements.length).toBe(2);
  });

  it('returns null when services is empty', () => {
    const { container } = render(
      <ServicesGrid3Cards
        branding={createMockBranding()}
        config={createMockConfig({ services: [] })}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('includes branding name and city in subtitle', () => {
    render(
      <ServicesGrid3Cards
        branding={createMockBranding({ name: 'Acme Renos', city: 'Ottawa' })}
        config={createMockConfig({
          services: [
            { name: 'Kitchens', slug: 'kitchens', description: 'Renos.' },
          ],
        })}
      />
    );
    expect(screen.getByText(/Acme Renos/)).toBeDefined();
    expect(screen.getByText(/Ottawa/)).toBeDefined();
  });
});
