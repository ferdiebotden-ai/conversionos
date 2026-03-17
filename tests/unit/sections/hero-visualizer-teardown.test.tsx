/**
 * VisualizerTeardownHero Section — Unit Tests
 *
 * Tests rendering, 5 style tabs, frame scrubber / tile fallback,
 * accessibility, keyboard, and reduced motion fallback.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Branding } from '@/lib/branding';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';

// ── Mocks ─────────────────────────────────────────────────────────

const mockUseReducedMotion = vi.fn(() => false);

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, style, className, ...rest }: { children?: React.ReactNode; style?: Record<string, unknown>; className?: string }) => (
      <div className={className} style={style as React.CSSProperties} data-testid="motion-div" {...rest}>{children}</div>
    ),
  },
  useReducedMotion: () => mockUseReducedMotion(),
  useMotionValue: (initial: number) => ({ get: () => initial, set: vi.fn(), on: vi.fn() }),
  useMotionValueEvent: vi.fn(),
  useTransform: (_mv: unknown, fn: (v: number) => string) => fn(0),
  animate: vi.fn(() => ({ stop: vi.fn() })),
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} data-testid="next-image" />,
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }: { children: React.ReactNode; href: string }) => <a {...props}>{children}</a>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ComponentProps<'button'> & { asChild?: boolean }) => {
    if (props.asChild) return <>{children}</>;
    return <button {...props}>{children}</button>;
  },
}));

vi.mock('@/hooks/use-slider-motion', () => ({
  useSliderMotion: () => ({
    position: { get: () => 0, set: vi.fn(), on: vi.fn() },
    isDragging: false,
    showLabels: true,
    trackRef: { current: null },
    handlers: { onMouseDown: vi.fn(), onTouchStart: vi.fn(), onKeyDown: vi.fn() },
    runIntroAnimation: vi.fn(() => Promise.resolve()),
    cancelAnimation: vi.fn(),
  }),
}));

// ── Test helpers ──────────────────────────────────────────────────

function createMockBranding(overrides: Partial<Branding> = {}): Branding {
  return {
    name: 'Test Reno Co', tagline: 'Quality Renovations', phone: '(555) 123-4567',
    email: 'test@example.com', website: 'test.norbotsystems.com', address: '123 Test St',
    city: 'Toronto', province: 'ON', postal: 'M1M 1M1', socials: [],
    paymentEmail: 'pay@example.com', quotesEmail: 'quotes@example.com',
    primaryColor: '#0D9488', primaryOklch: '0.588 0.108 180', services: [],
    ...overrides,
  };
}

function createMockConfig(overrides: Partial<CompanyConfig> = {}): CompanyConfig {
  return {
    name: 'Test Reno Co', location: 'Toronto, ON, Canada', phone: '(555) 123-4567',
    email: 'test@example.com', website: 'test.norbotsystems.com', principals: 'John Doe',
    tagline: 'Quality Renovations', founded: '2020', booking: '',
    serviceArea: 'Greater Toronto Area', certifications: [], socials: [],
    paymentEmail: 'pay@example.com', quotesEmail: 'quotes@example.com',
    address: '123 Test St', city: 'Toronto', province: 'ON', postal: 'M1M 1M1',
    hours: 'Mon-Fri 9am-5pm', primaryColor: '#0D9488', primaryOklch: '0.588 0.108 180',
    testimonials: [], aboutCopy: ['We are a renovation company.'], mission: 'Great renovations.',
    services: [{ name: 'Kitchen Renovation', slug: 'kitchen-renovation', description: 'Kitchen renos.' }],
    heroHeadline: 'Transform Your Home', heroSubheadline: 'Professional renovations in Toronto.',
    heroImageUrl: 'https://example.com/hero.jpg', aboutImageUrl: '', logoUrl: '/logo.svg',
    trustBadges: [{ label: 'Licensed', iconHint: 'shield' }, { label: 'Insured', iconHint: 'award' }],
    whyChooseUs: [], values: [], processSteps: [], teamMembers: [], portfolio: [],
    trustMetrics: { google_rating: '4.9', projects_completed: '50+', years_in_business: '10', licensed_insured: true },
    ...overrides,
  };
}

const { VisualizerTeardownHero } = await import('@/sections/hero/visualizer-teardown');

// ── Tests ─────────────────────────────────────────────────────────

describe('VisualizerTeardownHero', () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false);
  });

  // ── Rendering ─────────────────────────────────────────────────

  it('renders hero headline from config', () => {
    render(<VisualizerTeardownHero branding={createMockBranding()} config={createMockConfig({ heroHeadline: 'Build Your Dream Home' })} />);
    expect(screen.getByText('Build Your Dream Home')).toBeDefined();
  });

  it('falls back to branding tagline when heroHeadline is empty', () => {
    render(<VisualizerTeardownHero branding={createMockBranding({ tagline: 'Best Renos' })} config={createMockConfig({ heroHeadline: '' })} />);
    expect(screen.getByText('Best Renos')).toBeDefined();
  });

  it('renders description text', () => {
    render(<VisualizerTeardownHero branding={createMockBranding()} config={createMockConfig()} />);
    expect(screen.getByText(/See your renovation vision come to life/)).toBeDefined();
  });

  it('renders CTA link to /visualizer', () => {
    render(<VisualizerTeardownHero branding={createMockBranding()} config={createMockConfig()} />);
    const link = screen.getByText('Visualise Your Dream Space');
    expect(link.closest('a')?.getAttribute('href')).toBe('/visualizer');
  });

  it('renders phone link when branding.phone is set', () => {
    render(<VisualizerTeardownHero branding={createMockBranding({ phone: '(416) 555-1234' })} config={createMockConfig()} />);
    expect(screen.getByText('(416) 555-1234')).toBeDefined();
  });

  it('does not render phone link when phone is empty', () => {
    render(<VisualizerTeardownHero branding={createMockBranding({ phone: '' })} config={createMockConfig()} />);
    expect(screen.queryByText(/\(\d+\)/)).toBeNull();
  });

  // ── Style Tabs (5 styles) ─────────────────────────────────────

  it('renders all 5 style tabs', () => {
    render(<VisualizerTeardownHero branding={createMockBranding()} config={createMockConfig()} />);
    for (const label of ['Transitional', 'Modern', 'Farmhouse', 'Industrial', 'Scandinavian']) {
      expect(screen.getByText(label)).toBeDefined();
    }
  });

  it('first tab (Transitional) is active by default', () => {
    render(<VisualizerTeardownHero branding={createMockBranding()} config={createMockConfig()} />);
    expect(screen.getByText('Transitional').className).toContain('bg-primary');
  });

  it('clicking a different tab updates active state', () => {
    render(<VisualizerTeardownHero branding={createMockBranding()} config={createMockConfig()} />);
    fireEvent.click(screen.getByText('Farmhouse'));
    expect(screen.getByText('Farmhouse').className).toContain('bg-primary');
    expect(screen.getByText('Transitional').className).not.toContain('bg-primary');
  });

  it('cycling all 5 tabs and back — no stale state', () => {
    render(<VisualizerTeardownHero branding={createMockBranding()} config={createMockConfig()} />);
    for (const label of ['Transitional', 'Modern', 'Farmhouse', 'Industrial', 'Scandinavian']) {
      fireEvent.click(screen.getByText(label));
      expect(screen.getByText(label).className).toContain('bg-primary');
    }
    fireEvent.click(screen.getByText('Transitional'));
    expect(screen.getByText('Transitional').className).toContain('bg-primary');
    expect(screen.getByText('Scandinavian').className).not.toContain('bg-primary');
  });

  // ── Accessibility ─────────────────────────────────────────────

  it('renders slider with ARIA attributes', () => {
    render(<VisualizerTeardownHero branding={createMockBranding()} config={createMockConfig()} />);
    const slider = screen.getByRole('slider');
    expect(slider.getAttribute('aria-valuemin')).toBe('0');
    expect(slider.getAttribute('aria-valuemax')).toBe('100');
    expect(slider.getAttribute('aria-label')).toBe('Before and after comparison');
  });

  it('slider is keyboard-focusable', () => {
    render(<VisualizerTeardownHero branding={createMockBranding()} config={createMockConfig()} />);
    expect(screen.getByRole('slider').getAttribute('tabindex')).toBe('0');
  });

  // ── Reduced motion fallback ───────────────────────────────────

  it('renders <img> elements when reduced motion is true', () => {
    mockUseReducedMotion.mockReturnValue(true);
    render(<VisualizerTeardownHero branding={createMockBranding()} config={createMockConfig()} />);
    const images = screen.getAllByTestId('next-image');
    expect(images.length).toBeGreaterThanOrEqual(2);
  });

  // ── Labels and badges ─────────────────────────────────────────

  it('renders Before and After corner labels', () => {
    render(<VisualizerTeardownHero branding={createMockBranding()} config={createMockConfig()} />);
    expect(screen.getAllByText('Before').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('After').length).toBeGreaterThanOrEqual(2);
  });

  it('renders AI-Powered badge', () => {
    render(<VisualizerTeardownHero branding={createMockBranding()} config={createMockConfig()} />);
    expect(screen.getByText('AI-Powered')).toBeDefined();
  });

  it('renders Try with Your Space CTA', () => {
    render(<VisualizerTeardownHero branding={createMockBranding()} config={createMockConfig()} />);
    const cta = screen.getByText('Try with Your Space');
    expect(cta.closest('a')?.getAttribute('href')).toBe('/visualizer');
  });
});
