/**
 * TestimonialsCardsCarousel Section — Unit Tests
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
    trustMetrics: {},
    ...overrides,
  };
}

const { TestimonialsCardsCarousel } = await import('@/sections/testimonials/cards-carousel');

describe('TestimonialsCardsCarousel', () => {
  const twoTestimonials = [
    { author: 'Sarah M., Kitchener', quote: 'Amazing kitchen transformation!', projectType: 'Kitchen Renovation' },
    { author: 'James R., London', quote: 'Our basement looks incredible.', projectType: 'Basement Finishing' },
  ];

  it('renders "What Our Clients Say" heading', () => {
    render(
      <TestimonialsCardsCarousel
        branding={createMockBranding()}
        config={createMockConfig({ testimonials: twoTestimonials })}
      />
    );
    expect(screen.getByText('What Our Clients Say')).toBeDefined();
  });

  it('renders testimonial quotes', () => {
    render(
      <TestimonialsCardsCarousel
        branding={createMockBranding()}
        config={createMockConfig({ testimonials: twoTestimonials })}
      />
    );
    expect(screen.getByText(/Amazing kitchen transformation!/)).toBeDefined();
    expect(screen.getByText(/Our basement looks incredible./)).toBeDefined();
  });

  it('renders author names', () => {
    render(
      <TestimonialsCardsCarousel
        branding={createMockBranding()}
        config={createMockConfig({ testimonials: twoTestimonials })}
      />
    );
    expect(screen.getByText('Sarah M., Kitchener')).toBeDefined();
    expect(screen.getByText('James R., London')).toBeDefined();
  });

  it('renders project types', () => {
    render(
      <TestimonialsCardsCarousel
        branding={createMockBranding()}
        config={createMockConfig({ testimonials: twoTestimonials })}
      />
    );
    expect(screen.getByText('Kitchen Renovation')).toBeDefined();
    expect(screen.getByText('Basement Finishing')).toBeDefined();
  });

  it('returns null when testimonials has fewer than 2 items', () => {
    const { container } = render(
      <TestimonialsCardsCarousel
        branding={createMockBranding()}
        config={createMockConfig({
          testimonials: [
            { author: 'Solo', quote: 'Good work.', projectType: 'Kitchen' },
          ],
        })}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('returns null when testimonials is empty', () => {
    const { container } = render(
      <TestimonialsCardsCarousel
        branding={createMockBranding()}
        config={createMockConfig({ testimonials: [] })}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders three testimonials when provided', () => {
    const threeTestimonials = [
      ...twoTestimonials,
      { author: 'Priya K., Hamilton', quote: 'First-time homeowner success.', projectType: 'Bathroom Renovation' },
    ];
    render(
      <TestimonialsCardsCarousel
        branding={createMockBranding()}
        config={createMockConfig({ testimonials: threeTestimonials })}
      />
    );
    expect(screen.getByText(/First-time homeowner success./)).toBeDefined();
    expect(screen.getByText('Priya K., Hamilton')).toBeDefined();
  });
});
