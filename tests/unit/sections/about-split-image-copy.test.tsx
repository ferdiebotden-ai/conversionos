/**
 * AboutSplitImageCopy Section — Unit Tests
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
    aboutCopy: ['We are a great renovation company.', 'We serve the GTA.'],
    mission: 'To deliver excellence.',
    services: [],
    heroHeadline: '',
    heroSubheadline: '',
    heroImageUrl: '',
    aboutImageUrl: 'https://example.com/about.jpg',
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

const { AboutSplitImageCopy } = await import('@/sections/about/split-image-copy');

describe('AboutSplitImageCopy', () => {
  it('renders heading with branding name', () => {
    render(
      <AboutSplitImageCopy
        branding={createMockBranding({ name: 'Acme Renos' })}
        config={createMockConfig()}
      />
    );
    expect(screen.getByText('About Acme Renos')).toBeDefined();
  });

  it('renders about copy paragraphs', () => {
    render(
      <AboutSplitImageCopy
        branding={createMockBranding()}
        config={createMockConfig({
          aboutCopy: ['First paragraph.', 'Second paragraph.'],
        })}
      />
    );
    expect(screen.getByText('First paragraph.')).toBeDefined();
    expect(screen.getByText('Second paragraph.')).toBeDefined();
  });

  it('renders mission statement as blockquote', () => {
    render(
      <AboutSplitImageCopy
        branding={createMockBranding()}
        config={createMockConfig({ mission: 'Our mission is excellence.' })}
      />
    );
    const blockquote = screen.getByText('Our mission is excellence.');
    expect(blockquote.closest('blockquote')).toBeDefined();
  });

  it('does not render mission blockquote when mission is empty', () => {
    const { container } = render(
      <AboutSplitImageCopy
        branding={createMockBranding()}
        config={createMockConfig({ mission: '' })}
      />
    );
    expect(container.querySelector('blockquote')).toBeNull();
  });

  it('renders about image when aboutImageUrl is set', () => {
    render(
      <AboutSplitImageCopy
        branding={createMockBranding({ name: 'Acme Renos' })}
        config={createMockConfig({ aboutImageUrl: 'https://example.com/about.jpg' })}
      />
    );
    const img = screen.getByAltText('About Acme Renos');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('https://example.com/about.jpg');
  });

  it('falls back to heroImageUrl when aboutImageUrl is empty', () => {
    render(
      <AboutSplitImageCopy
        branding={createMockBranding({ name: 'Acme Renos' })}
        config={createMockConfig({ aboutImageUrl: '', heroImageUrl: 'https://example.com/hero.jpg' })}
      />
    );
    const img = screen.getByAltText('About Acme Renos');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('https://example.com/hero.jpg');
  });

  it('renders without image when both aboutImageUrl and heroImageUrl are empty', () => {
    render(
      <AboutSplitImageCopy
        branding={createMockBranding()}
        config={createMockConfig({ aboutImageUrl: '', heroImageUrl: '' })}
      />
    );
    // Should still render text content
    expect(screen.getByText(/About Test Reno Co/)).toBeDefined();
    // No image element should be present
    expect(screen.queryByAltText(/About/)).toBeNull();
  });

  it('renders with empty aboutCopy array', () => {
    render(
      <AboutSplitImageCopy
        branding={createMockBranding()}
        config={createMockConfig({ aboutCopy: [] })}
      />
    );
    // Should still render the heading
    expect(screen.getByText(/About Test Reno Co/)).toBeDefined();
  });
});
