'use client';

import * as React from 'react';

interface SRAnnounceProps {
  message: string;
  /** aria-live politeness level. Defaults to 'polite'. */
  politeness?: 'polite' | 'assertive';
}

/**
 * Screen reader announcement component.
 * Visually hidden, but announces messages to assistive technology.
 */
export function SRAnnounce({ message, politeness = 'polite' }: SRAnnounceProps) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
