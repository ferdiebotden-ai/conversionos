'use client';

import { useCallback, useRef, useEffect } from 'react';
import type { RefObject } from 'react';

export interface PreviewBranding {
  name?: string | undefined;
  tagline?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
  website?: string | undefined;
  address?: string | undefined;
  city?: string | undefined;
  province?: string | undefined;
  postal?: string | undefined;
  primaryColor?: string | undefined;
  primaryOklch?: string | undefined;
}

export const PREVIEW_MESSAGE_TYPE = 'conversionos-settings-preview';

export interface PreviewMessage {
  type: typeof PREVIEW_MESSAGE_TYPE;
  data: PreviewBranding;
}

/**
 * Debounced postMessage sender for live settings preview.
 * Sends current branding state to the iframe after a 500ms debounce.
 */
export function useSettingsPreview(iframeRef: RefObject<HTMLIFrameElement | null>) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const sendPreviewUpdate = useCallback(
    (branding: PreviewBranding) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) return;

        const message: PreviewMessage = {
          type: PREVIEW_MESSAGE_TYPE,
          data: branding,
        };

        iframe.contentWindow.postMessage(message, window.location.origin);
      }, 500);
    },
    [iframeRef],
  );

  return { sendPreviewUpdate };
}
