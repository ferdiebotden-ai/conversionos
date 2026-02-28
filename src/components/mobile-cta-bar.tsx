'use client';

/**
 * Sticky Mobile CTA Bar
 * Fixed bottom bar on mobile (<768px) with Call + Get Estimate buttons.
 * Hidden on /estimate, /visualizer, /admin/* routes.
 *
 * Sets --mobile-cta-bar-height CSS custom property on <html> so the
 * ReceptionistWidget FAB can offset itself above this bar.
 */

import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBranding } from '@/components/branding-provider';
import { useCopyContext } from '@/lib/copy/use-site-copy';
import { getMobileCTA } from '@/lib/copy/site-copy';

const HIDDEN_PATHS = ['/estimate', '/visualizer', '/admin', '/contact'];

export function MobileCTABar() {
  const pathname = usePathname();
  const branding = useBranding();
  const mobileCta = getMobileCTA(useCopyContext());
  const [visible, setVisible] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Show after first scroll or 2s delay
    let shown = false;

    function show() {
      if (!shown) {
        shown = true;
        setVisible(true);
      }
    }

    function onScroll() {
      if (window.scrollY > 100) {
        show();
        window.removeEventListener('scroll', onScroll);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    const timeout = setTimeout(show, 2000);

    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(timeout);
    };
  }, []);

  // Hide on specific routes
  const isHidden = HIDDEN_PATHS.some(p => pathname.startsWith(p));

  // Set CSS custom property for FAB coordination
  useEffect(() => {
    if (isHidden || !visible) {
      document.documentElement.style.removeProperty('--mobile-cta-bar-height');
      return;
    }

    const el = barRef.current;
    if (!el) return;

    const update = () => {
      document.documentElement.style.setProperty(
        '--mobile-cta-bar-height',
        `${el.offsetHeight}px`
      );
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty('--mobile-cta-bar-height');
    };
  }, [isHidden, visible]);

  if (isHidden || !visible) return null;

  const phoneDigits = branding.phone.replace(/\D/g, '');

  return (
    <div
      ref={barRef}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden"
    >
      <div className="flex gap-2">
        <Button
          asChild
          variant="outline"
          className="h-11 flex-1 rounded-full text-sm font-semibold"
        >
          <a href={`tel:${phoneDigits}`}>
            <Phone className="mr-1.5 size-4" />
            Call
          </a>
        </Button>
        <Button
          asChild
          className="h-11 flex-1 rounded-full text-sm font-semibold"
        >
          <Link href={mobileCta.href}>{mobileCta.label}</Link>
        </Button>
      </div>
    </div>
  );
}
