/**
 * useMediaQuery hook tests
 * SSR safety, initial matching, and resize event handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from '@/hooks/use-media-query';

// --- Helpers ---

interface MockMQL {
  matches: boolean;
  media: string;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  dispatchEvent: ReturnType<typeof vi.fn>;
  onchange: null;
  addListener: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
}

function createMockMatchMedia(matches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  const mql: MockMQL = {
    matches,
    media: '',
    addEventListener: vi.fn((_event: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.push(cb);
    }),
    removeEventListener: vi.fn((_event: string, cb: (e: MediaQueryListEvent) => void) => {
      const idx = listeners.indexOf(cb);
      if (idx >= 0) listeners.splice(idx, 1);
    }),
    dispatchEvent: vi.fn(),
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
  };

  return {
    mql,
    listeners,
    triggerChange(newMatches: boolean) {
      mql.matches = newMatches;
      listeners.forEach((cb) => cb({ matches: newMatches } as MediaQueryListEvent));
    },
  };
}

// --- Tests ---

describe('useMediaQuery', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('returns the current match state on render (useSyncExternalStore)', () => {
    const mock = createMockMatchMedia(true);
    window.matchMedia = vi.fn().mockReturnValue(mock.mql as unknown as MediaQueryList);

    // useSyncExternalStore calls getSnapshot synchronously — returns true immediately
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(true);
  });

  it('returns true when query matches', () => {
    const mock = createMockMatchMedia(true);
    window.matchMedia = vi.fn().mockReturnValue(mock.mql as unknown as MediaQueryList);

    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(true);
  });

  it('returns false when query does not match', () => {
    const mock = createMockMatchMedia(false);
    window.matchMedia = vi.fn().mockReturnValue(mock.mql as unknown as MediaQueryList);

    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(false);
  });

  it('updates when media query changes', () => {
    const mock = createMockMatchMedia(false);
    // useSyncExternalStore calls matchMedia multiple times (subscribe + getSnapshot)
    window.matchMedia = vi.fn().mockReturnValue(mock.mql as unknown as MediaQueryList);

    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(false);

    act(() => {
      mock.triggerChange(true);
    });

    expect(result.current).toBe(true);
  });

  it('cleans up listener on unmount', () => {
    const mock = createMockMatchMedia(false);
    window.matchMedia = vi.fn().mockReturnValue(mock.mql as unknown as MediaQueryList);

    const { unmount } = renderHook(() => useMediaQuery('(max-width: 767px)'));

    expect(mock.mql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    unmount();

    expect(mock.mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('re-subscribes when query string changes', () => {
    const mock1 = createMockMatchMedia(true);
    const mock2 = createMockMatchMedia(false);

    // useSyncExternalStore calls matchMedia in both subscribe and getSnapshot,
    // so multiple calls per render cycle. Use mockImplementation for flexibility.
    window.matchMedia = vi.fn().mockImplementation((query: string) => {
      if (query === '(max-width: 767px)') return mock1.mql as unknown as MediaQueryList;
      return mock2.mql as unknown as MediaQueryList;
    });

    const { result, rerender } = renderHook(
      ({ query }) => useMediaQuery(query),
      { initialProps: { query: '(max-width: 767px)' } }
    );

    expect(result.current).toBe(true);

    rerender({ query: '(min-width: 1024px)' });

    expect(result.current).toBe(false);
    // First listener should have been removed
    expect(mock1.mql.removeEventListener).toHaveBeenCalled();
  });
});
