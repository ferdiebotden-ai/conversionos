/**
 * Chat Accessibility & Polish Tests
 * Tests for V6 (char limit), P4 (memo stability), A6 (aria-live), A8 (focus-visible)
 */

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

function readSrc(relPath: string): string {
  return readFileSync(join(ROOT, relPath), 'utf-8');
}

describe('V6: Max message length', () => {
  const inputSource = readSrc('src/components/receptionist/receptionist-input.tsx');

  test('imports MAX_CHAT_LENGTH from validation', () => {
    expect(inputSource).toContain("import { MAX_CHAT_LENGTH } from '@/lib/utils/validation'");
  });

  test('sets maxLength on textarea', () => {
    expect(inputSource).toContain('maxLength={MAX_CHAT_LENGTH}');
  });

  test('shows character count above 1800', () => {
    expect(inputSource).toContain('value.length > 1800');
    expect(inputSource).toContain('{value.length}/{MAX_CHAT_LENGTH}');
  });

  test('disables send button at limit', () => {
    expect(inputSource).toContain('isAtLimit');
    expect(inputSource).toContain('value.length >= MAX_CHAT_LENGTH');
    expect(inputSource).toContain('disabled={!value.trim() || disabled || isAtLimit}');
  });

  test('MAX_CHAT_LENGTH is 2000', () => {
    const validationSource = readSrc('src/lib/utils/validation.ts');
    expect(validationSource).toContain('MAX_CHAT_LENGTH = 2000');
  });
});

describe('P4: Memoized chat transport', () => {
  const chatSource = readSrc('src/components/receptionist/receptionist-chat.tsx');

  test('transport is wrapped in useMemo', () => {
    // The transport creation should be inside a useMemo call
    expect(chatSource).toContain('const transport = useMemo(');
    expect(chatSource).toContain('new DefaultChatTransport');
  });

  test('useMemo has stable deps (empty array)', () => {
    // The transport useMemo should have an empty dependency array since API URL is constant
    const transportMemoMatch = chatSource.match(
      /const transport = useMemo\(\s*\(\) => new DefaultChatTransport[\s\S]*?\[\]/
    );
    expect(transportMemoMatch).not.toBeNull();
  });
});

describe('A6: Chat messages aria-live', () => {
  const chatSource = readSrc('src/components/receptionist/receptionist-chat.tsx');

  test('ScrollArea has aria-live="polite"', () => {
    expect(chatSource).toContain('aria-live="polite"');
  });

  test('ScrollArea has role="log"', () => {
    expect(chatSource).toContain('role="log"');
  });

  test('aria-live and role are on the same ScrollArea element', () => {
    // Both attributes should appear on the ScrollArea line
    const scrollAreaLine = chatSource
      .split('\n')
      .find((line: string) => line.includes('ScrollArea') && line.includes('aria-live'));
    expect(scrollAreaLine).toBeDefined();
    expect(scrollAreaLine).toContain('role="log"');
  });
});

describe('A8: Focus-visible indicators', () => {
  const cssSource = readSrc('src/app/globals.css');

  test('has focus-visible rule in CSS', () => {
    expect(cssSource).toContain('*:focus-visible');
  });

  test('uses primary colour for outline', () => {
    expect(cssSource).toContain('outline: 2px solid var(--primary)');
  });

  test('has outline-offset', () => {
    expect(cssSource).toContain('outline-offset: 2px');
  });

  test('focus-visible rule is inside @layer base', () => {
    const layerBaseIndex = cssSource.indexOf('@layer base');
    const focusVisibleIndex = cssSource.indexOf('*:focus-visible');
    expect(layerBaseIndex).toBeLessThan(focusVisibleIndex);
    // Find the closing brace of @layer base
    const afterLayer = cssSource.slice(layerBaseIndex);
    const focusInLayer = afterLayer.indexOf('*:focus-visible');
    expect(focusInLayer).toBeGreaterThan(0);
  });
});

describe('A4: SRAnnounce wired into chat', () => {
  const chatSource = readSrc('src/components/receptionist/receptionist-chat.tsx');

  test('imports SRAnnounce', () => {
    expect(chatSource).toContain("import { SRAnnounce } from '@/components/ui/sr-announce'");
  });

  test('renders SRAnnounce component', () => {
    expect(chatSource).toContain('<SRAnnounce');
    expect(chatSource).toContain('message={srMessage}');
  });

  test('srMessage includes typing state', () => {
    expect(chatSource).toContain("'Emma is typing...'");
  });

  // Voice mode tests removed — voice chat feature removed from receptionist
});

describe('M7: Chat height on short phones', () => {
  const chatSource = readSrc('src/components/receptionist/receptionist-chat.tsx');

  test('uses responsive max-height with dvh', () => {
    expect(chatSource).toContain('max-h-[min(520px,calc(100dvh-120px))]');
  });

  test('does not have fixed h-[520px]', () => {
    expect(chatSource).not.toContain('h-[520px]');
  });
});
