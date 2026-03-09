/**
 * GalleryMasonryGrid Section — Unit Tests
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

const { GalleryMasonryGrid } = await import('@/sections/gallery/masonry-grid');

describe('GalleryMasonryGrid', () => {
  it('renders "Our Work" heading when portfolio exists', () => {
    render(
      <GalleryMasonryGrid
        branding={createMockBranding()}
        config={createMockConfig({
          portfolio: [
            { title: 'Kitchen Reno', description: 'A nice kitchen.', imageUrl: 'https://example.com/k.jpg', serviceType: 'Kitchen', location: 'Toronto' },
          ],
        })}
      />
    );
    expect(screen.getByText('Our Work')).toBeDefined();
  });

  it('renders branding name in subtitle', () => {
    render(
      <GalleryMasonryGrid
        branding={createMockBranding({ name: 'Acme Renos' })}
        config={createMockConfig({
          portfolio: [
            { title: 'Project A', description: '', imageUrl: 'https://example.com/a.jpg', serviceType: '', location: '' },
          ],
        })}
      />
    );
    expect(screen.getByText('Featured projects by Acme Renos')).toBeDefined();
  });

  it('renders portfolio images with alt text', () => {
    render(
      <GalleryMasonryGrid
        branding={createMockBranding()}
        config={createMockConfig({
          portfolio: [
            { title: 'Kitchen Reno', description: '', imageUrl: 'https://example.com/k.jpg', serviceType: '', location: '' },
            { title: 'Bath Reno', description: '', imageUrl: 'https://example.com/b.jpg', serviceType: '', location: '' },
          ],
        })}
      />
    );
    expect(screen.getByAltText('Kitchen Reno')).toBeDefined();
    expect(screen.getByAltText('Bath Reno')).toBeDefined();
  });

  it('renders title placeholder when imageUrl is empty', () => {
    render(
      <GalleryMasonryGrid
        branding={createMockBranding()}
        config={createMockConfig({
          portfolio: [
            { title: 'No Image Project', description: '', imageUrl: '', serviceType: '', location: '' },
          ],
        })}
      />
    );
    // Title appears in both placeholder div and hover overlay, so use getAllByText
    expect(screen.getAllByText('No Image Project').length).toBeGreaterThanOrEqual(1);
  });

  it('renders "View All Projects" link', () => {
    render(
      <GalleryMasonryGrid
        branding={createMockBranding()}
        config={createMockConfig({
          portfolio: [
            { title: 'Project A', description: '', imageUrl: 'https://example.com/a.jpg', serviceType: '', location: '' },
          ],
        })}
      />
    );
    const links = screen.getAllByText('View All Projects');
    expect(links.length).toBeGreaterThanOrEqual(1);
    // At least one should link to /projects
    const link = links.find(el => el.closest('a')?.getAttribute('href') === '/projects');
    expect(link).toBeDefined();
  });

  it('returns null when portfolio is empty', () => {
    const { container } = render(
      <GalleryMasonryGrid
        branding={createMockBranding()}
        config={createMockConfig({ portfolio: [] })}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders description in hover overlay when provided', () => {
    render(
      <GalleryMasonryGrid
        branding={createMockBranding()}
        config={createMockConfig({
          portfolio: [
            { title: 'Kitchen', description: 'Modern kitchen with island.', imageUrl: 'https://example.com/k.jpg', serviceType: '', location: '' },
          ],
        })}
      />
    );
    expect(screen.getByText('Modern kitchen with island.')).toBeDefined();
  });
});
