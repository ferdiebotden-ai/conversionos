'use client';

import { useRef, useEffect, useState } from 'react';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettingsPreview, type PreviewBranding } from '@/hooks/use-settings-preview';
import { cn } from '@/lib/utils';

type Viewport = 'desktop' | 'tablet' | 'mobile';

const VIEWPORT_WIDTHS: Record<Viewport, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 375,
};

interface SettingsPreviewProps {
  settings: PreviewBranding;
}

export function SettingsPreview({ settings }: SettingsPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { sendPreviewUpdate } = useSettingsPreview(iframeRef);
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Send preview updates when settings change
  useEffect(() => {
    if (iframeLoaded) {
      sendPreviewUpdate(settings);
    }
  }, [settings, sendPreviewUpdate, iframeLoaded]);

  const viewportWidth = VIEWPORT_WIDTHS[viewport];

  return (
    <div className="flex flex-col h-full border-l bg-muted/30">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-background">
        <span className="text-xs font-medium text-amber-600">
          Preview — unsaved changes
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant={viewport === 'desktop' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewport('desktop')}
            aria-label="Desktop preview"
          >
            <Monitor className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={viewport === 'tablet' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewport('tablet')}
            aria-label="Tablet preview"
          >
            <Tablet className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={viewport === 'mobile' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewport('mobile')}
            aria-label="Mobile preview"
          >
            <Smartphone className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Iframe container */}
      <div className="flex-1 overflow-auto flex justify-center p-4 bg-muted/50">
        <div
          className={cn(
            'bg-white rounded-lg shadow-sm overflow-hidden transition-all duration-300',
            'h-[calc(100vh-12rem)]',
          )}
          style={{ width: `${viewportWidth}px`, maxWidth: '100%' }}
          data-testid="preview-viewport"
        >
          <iframe
            ref={iframeRef}
            src="/?__preview=1"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
            title="Settings preview"
            onLoad={() => setIframeLoaded(true)}
          />
        </div>
      </div>
    </div>
  );
}
