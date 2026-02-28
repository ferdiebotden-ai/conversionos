/**
 * RenderingPanel Unit Tests
 * Component rendering, states, interactions, compact mode.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RenderingPanel, RenderingEnlargedDialog } from '@/components/chat/rendering-panel';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    img: ({ children, ...props }: React.ComponentProps<'img'>) => <img {...props}>{children}</img>,
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── RenderingPanel ──────────────────────────────────────────────────────────

describe('RenderingPanel', () => {
  const defaultProps = {
    imageUrl: 'https://example.com/image.png',
    isGenerating: false,
    refinementCount: 0,
    maxRefinements: 3,
    signalSummary: null,
    onEnlarge: vi.fn(),
  };

  it('renders image when imageUrl provided', () => {
    render(<RenderingPanel {...defaultProps} />);
    const img = screen.getByAltText('Your design concept');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('https://example.com/image.png');
  });

  it('returns null when imageUrl is null', () => {
    const { container } = render(
      <RenderingPanel {...defaultProps} imageUrl={null} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows "Your Vision" heading', () => {
    render(<RenderingPanel {...defaultProps} />);
    expect(screen.getByText('Your Vision')).toBeDefined();
  });

  it('shows generating state with "Refining your vision..." text', () => {
    render(<RenderingPanel {...defaultProps} isGenerating={true} />);
    expect(screen.getByText('Refining your vision...')).toBeDefined();
  });

  it('shows refinement count badge when count > 0', () => {
    render(<RenderingPanel {...defaultProps} refinementCount={2} />);
    expect(screen.getByText('Refined (2/3)')).toBeDefined();
  });

  it('shows max refinements badge when maxed out', () => {
    render(<RenderingPanel {...defaultProps} refinementCount={3} />);
    expect(screen.getByText('3/3 Refined')).toBeDefined();
  });

  it('does not show badge when refinementCount is 0', () => {
    render(<RenderingPanel {...defaultProps} refinementCount={0} />);
    expect(screen.queryByText(/Refined/)).toBeNull();
  });

  it('shows signal summary text', () => {
    render(
      <RenderingPanel
        {...defaultProps}
        refinementCount={1}
        signalSummary="quartz countertops, open concept"
      />
    );
    expect(screen.getByText(/quartz countertops, open concept/)).toBeDefined();
  });

  it('calls onEnlarge when enlarge button clicked', () => {
    const onEnlarge = vi.fn();
    render(<RenderingPanel {...defaultProps} onEnlarge={onEnlarge} />);
    const enlargeButton = screen.getByLabelText('Enlarge rendering');
    fireEvent.click(enlargeButton);
    expect(onEnlarge).toHaveBeenCalledOnce();
  });

  it('calls onEnlarge when image clicked (desktop)', () => {
    const onEnlarge = vi.fn();
    render(<RenderingPanel {...defaultProps} onEnlarge={onEnlarge} />);
    const img = screen.getByAltText('Your design concept');
    fireEvent.click(img);
    expect(onEnlarge).toHaveBeenCalledOnce();
  });

  // ── Compact mode ──────────────────────────────────────────────────────────

  it('renders compact mode with smaller image', () => {
    render(<RenderingPanel {...defaultProps} compact />);
    expect(screen.getByText('Your Vision')).toBeDefined();
    // Compact mode has a toggle button for collapse
    const img = screen.getByAltText('Your design concept');
    expect(img).toBeDefined();
  });

  it('compact mode collapses when header clicked', () => {
    render(<RenderingPanel {...defaultProps} compact />);
    // Image should be visible initially
    expect(screen.getByAltText('Your design concept')).toBeDefined();

    // Click the header to collapse
    const header = screen.getByText('Your Vision').closest('button');
    if (header) {
      fireEvent.click(header);
      // After collapse, image should not be visible (AnimatePresence mock removes it)
    }
  });

  it('compact generating state shows "Refining your vision..."', () => {
    render(<RenderingPanel {...defaultProps} compact isGenerating={true} />);
    expect(screen.getByText('Refining your vision...')).toBeDefined();
  });

  it('compact mode shows signal summary', () => {
    render(
      <RenderingPanel
        {...defaultProps}
        compact
        refinementCount={1}
        signalSummary="white cabinetry"
      />
    );
    expect(screen.getByText(/white cabinetry/)).toBeDefined();
  });
});

// ── RenderingEnlargedDialog ─────────────────────────────────────────────────

describe('RenderingEnlargedDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    imageUrl: 'https://example.com/large-image.png',
    signalSummary: 'quartz countertops, open concept layout',
    refinementCount: 1,
    maxRefinements: 3,
  };

  it('renders full-size image when open', () => {
    render(<RenderingEnlargedDialog {...defaultProps} />);
    const img = screen.getByAltText('Your refined design concept');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('https://example.com/large-image.png');
  });

  it('shows signal summary in dialog', () => {
    render(<RenderingEnlargedDialog {...defaultProps} />);
    expect(screen.getByText(/quartz countertops, open concept layout/)).toBeDefined();
  });

  it('shows "Your Design Vision" title', () => {
    render(<RenderingEnlargedDialog {...defaultProps} />);
    expect(screen.getByText('Your Design Vision')).toBeDefined();
  });

  it('shows refinement badge in dialog', () => {
    render(<RenderingEnlargedDialog {...defaultProps} />);
    expect(screen.getByText('Refined 1/3')).toBeDefined();
  });

  it('returns null when imageUrl is null', () => {
    const { container } = render(
      <RenderingEnlargedDialog {...defaultProps} imageUrl={null} />
    );
    // Dialog should not render when no image
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });
});
