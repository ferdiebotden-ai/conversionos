/**
 * Settings Preview Tests (F13)
 * Tests for: useSettingsPreview hook, SettingsPreview component, BrandingProvider listener
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { useSettingsPreview, PREVIEW_MESSAGE_TYPE, type PreviewMessage } from '@/hooks/use-settings-preview';

const ROOT = join(__dirname, '../..');

function readSrc(relPath: string): string {
  return readFileSync(join(ROOT, relPath), 'utf-8');
}

describe('useSettingsPreview hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('sendPreviewUpdate debounces calls by 500ms', () => {
    const postMessageSpy = vi.fn();
    const mockIframe = {
      current: {
        contentWindow: { postMessage: postMessageSpy },
      },
    } as unknown as React.RefObject<HTMLIFrameElement | null>;

    const { result } = renderHook(() => useSettingsPreview(mockIframe));

    // Call multiple times rapidly
    act(() => {
      result.current.sendPreviewUpdate({ name: 'First' });
      result.current.sendPreviewUpdate({ name: 'Second' });
      result.current.sendPreviewUpdate({ name: 'Third' });
    });

    // Nothing sent yet (debounced)
    expect(postMessageSpy).not.toHaveBeenCalled();

    // Advance past debounce
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Only the last call should have been sent
    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: PREVIEW_MESSAGE_TYPE,
        data: { name: 'Third' },
      }),
      window.location.origin,
    );
  });

  test('does not send when iframe has no contentWindow', () => {
    const mockIframe = {
      current: { contentWindow: null },
    } as unknown as React.RefObject<HTMLIFrameElement | null>;

    const { result } = renderHook(() => useSettingsPreview(mockIframe));

    act(() => {
      result.current.sendPreviewUpdate({ name: 'Test' });
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // No error thrown, nothing sent
  });

  test('does not send when iframe ref is null', () => {
    const mockIframe = { current: null } as React.RefObject<HTMLIFrameElement | null>;

    const { result } = renderHook(() => useSettingsPreview(mockIframe));

    act(() => {
      result.current.sendPreviewUpdate({ name: 'Test' });
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // No error thrown
  });

  test('cleans up timer on unmount', () => {
    const postMessageSpy = vi.fn();
    const mockIframe = {
      current: {
        contentWindow: { postMessage: postMessageSpy },
      },
    } as unknown as React.RefObject<HTMLIFrameElement | null>;

    const { result, unmount } = renderHook(() => useSettingsPreview(mockIframe));

    act(() => {
      result.current.sendPreviewUpdate({ name: 'Test' });
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Timer was cleared on unmount — message not sent
    expect(postMessageSpy).not.toHaveBeenCalled();
  });
});

describe('PREVIEW_MESSAGE_TYPE constant', () => {
  test('has correct value', () => {
    expect(PREVIEW_MESSAGE_TYPE).toBe('conversionos-settings-preview');
  });
});

describe('PreviewMessage format', () => {
  test('matches expected schema', () => {
    const msg: PreviewMessage = {
      type: PREVIEW_MESSAGE_TYPE,
      data: {
        name: 'Test Co',
        phone: '555-1234',
        primaryColor: '#FF0000',
      },
    };
    expect(msg.type).toBe('conversionos-settings-preview');
    expect(msg.data).toHaveProperty('name', 'Test Co');
    expect(msg.data).toHaveProperty('phone', '555-1234');
    expect(msg.data).toHaveProperty('primaryColor', '#FF0000');
  });
});

describe('SettingsPreview component (source)', () => {
  const source = readSrc('src/components/admin/settings-preview.tsx');

  test('renders an iframe with __preview=1 query param', () => {
    expect(source).toContain('/?__preview=1');
  });

  test('iframe has sandbox attribute', () => {
    expect(source).toContain('sandbox="allow-scripts allow-same-origin"');
  });

  test('has three viewport buttons (desktop, tablet, mobile)', () => {
    expect(source).toContain("'desktop'");
    expect(source).toContain("'tablet'");
    expect(source).toContain("'mobile'");
  });

  test('viewport widths match spec', () => {
    expect(source).toContain('desktop: 1280');
    expect(source).toContain('tablet: 768');
    expect(source).toContain('mobile: 375');
  });

  test('shows unsaved changes banner', () => {
    expect(source).toContain('Preview — unsaved changes');
  });

  test('uses useSettingsPreview hook', () => {
    expect(source).toContain('useSettingsPreview');
  });

  test('has viewport data-testid for testing', () => {
    expect(source).toContain('data-testid="preview-viewport"');
  });
});

describe('BrandingProvider preview listener (source)', () => {
  const source = readSrc('src/components/branding-provider.tsx');

  test('imports PREVIEW_MESSAGE_TYPE', () => {
    expect(source).toContain("PREVIEW_MESSAGE_TYPE");
  });

  test('checks for __preview=1 query param', () => {
    expect(source).toContain('__preview');
  });

  test('only activates inside iframe (window.self !== window.top)', () => {
    expect(source).toContain('window.self === window.top');
  });

  test('validates message origin', () => {
    expect(source).toContain('event.origin !== window.location.origin');
  });

  test('adds and removes message event listener', () => {
    expect(source).toContain('addEventListener("message"');
    expect(source).toContain('removeEventListener("message"');
  });
});

describe('Settings page preview integration (source)', () => {
  const source = readSrc('src/app/admin/settings/page.tsx');

  test('imports SettingsPreview component', () => {
    expect(source).toContain("import { SettingsPreview }");
  });

  test('has showPreview state', () => {
    expect(source).toContain('showPreview');
    expect(source).toContain('setShowPreview');
  });

  test('has Eye/EyeOff toggle icons', () => {
    expect(source).toContain('Eye');
    expect(source).toContain('EyeOff');
  });

  test('preview toggle button exists', () => {
    expect(source).toContain('Show preview');
    expect(source).toContain('Hide preview');
  });

  test('renders SettingsPreview with settings prop', () => {
    expect(source).toContain('<SettingsPreview settings={previewBranding}');
  });

  test('derives previewBranding from business_info', () => {
    expect(source).toContain('previewBranding');
    expect(source).toContain('settings.business_info');
  });

  test('uses split layout when preview is active', () => {
    expect(source).toContain("w-1/2 min-w-[480px]");
  });
});
