'use client';

/**
 * Receptionist Widget
 * Single FAB chat widget with text/voice mode toggle inside the panel
 * Features Emma, the virtual receptionist
 * Animated with Framer Motion spring physics
 */

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MessageCircle, X, AudioLines } from 'lucide-react';
import { ReceptionistChat } from './receptionist-chat';
import { VoiceProvider, useVoice } from '@/components/voice/voice-provider';
import { panelSpring } from '@/lib/animations';
import { useBranding } from '@/components/branding-provider';
import { useTier } from '@/components/tier-provider';
import { useCopyContext } from '@/lib/copy/use-site-copy';
import { getHomepageTeaser } from '@/lib/copy/site-copy';

/** Pages where the widget is hidden (these have their own AI chat) */
const HIDDEN_PATHS = ['/estimate', '/visualizer'];
const HIDDEN_PREFIXES = ['/admin'];

/** Page-specific teaser messages (homepage handled by copy registry) */
const PAGE_TEASERS: Record<string, string> = {
  '/services': 'Questions about our services? I can help!',
  '/services/kitchen': 'Dreaming of a new kitchen? Let\'s talk about it!',
  '/services/bathroom': 'Bathroom reno on your mind? I\'ve got answers!',
  '/services/basement': 'Thinking about finishing your basement? Great investment!',
  '/services/outdoor': 'Want to extend your living space outdoors? Let\'s chat!',
  '/projects': 'Love what you see? Let\'s plan yours!',
  '/about': 'Want to learn more about working with us? Ask me anything!',
  '/contact': 'Need a quick answer? I might be able to help right now!',
};

const DEFAULT_TEASER = 'Hi! I\'m Emma. Need help with a renovation project?';

export function ReceptionistWidget() {
  const branding = useBranding();
  const { canAccess } = useTier();
  const copyCtx = useCopyContext();
  const pathname = usePathname();
  const shouldReduce = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [teaserDismissed, setTeaserDismissed] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Determine visibility
  const isHidden =
    HIDDEN_PATHS.includes(pathname) ||
    HIDDEN_PREFIXES.some(p => pathname.startsWith(p));

  // Proactive teaser after 6s delay
  useEffect(() => {
    if (isHidden || isOpen || teaserDismissed) return;

    const timer = setTimeout(() => {
      setShowTeaser(true);
    }, 6000);

    return () => clearTimeout(timer);
  }, [pathname, isHidden, isOpen, teaserDismissed]);

  // Pulse animation on first load (3s)
  useEffect(() => {
    if (hasAnimated) return;
    const timer = setTimeout(() => setHasAnimated(true), 3000);
    return () => clearTimeout(timer);
  }, [hasAnimated]);

  const handleFABClick = useCallback(() => {
    setIsOpen(prev => !prev);
    setShowTeaser(false);
    setTeaserDismissed(true);
  }, []);

  const handleTeaserDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTeaser(false);
    setTeaserDismissed(true);
  }, []);

  if (isHidden) return null;

  const rawTeaser = PAGE_TEASERS[pathname] || DEFAULT_TEASER;
  // Use copy registry for homepage teaser; other pages keep their page-specific teaser
  const teaserMessage = pathname === '/'
    ? getHomepageTeaser(copyCtx)
    : rawTeaser;

  return (
    <>
      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={panelSpring}
            className={cn(
              'fixed bottom-20 right-4 z-40',
              'w-[calc(100vw-2rem)] max-w-[400px] h-[520px]',
              'bg-background rounded-2xl shadow-2xl border border-border',
              'flex flex-col overflow-hidden'
            )}
          >
            {/* Chat Content — wrapped in VoiceProvider */}
            <VoiceProvider>
              <WidgetPanelHeader onClose={() => setIsOpen(false)} companyName={branding.name} />
              <div className="flex-1 min-h-0">
                <ReceptionistChat />
              </div>
            </VoiceProvider>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Proactive Teaser Bubble */}
      <AnimatePresence>
        {showTeaser && !isOpen && (
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn(
              'fixed bottom-20 right-4 z-40',
              'max-w-[260px] px-4 py-3 rounded-2xl rounded-br-md',
              'bg-background border border-border shadow-lg',
              'text-sm text-foreground',
              'cursor-pointer'
            )}
            onClick={handleFABClick}
          >
            <button
              onClick={handleTeaserDismiss}
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-3 w-3" />
            </button>
            {teaserMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Single FAB */}
      <motion.button
        onClick={handleFABClick}
        {...(!shouldReduce && { whileHover: { scale: 1.08 }, whileTap: { scale: 0.92 } })}
        className={cn(
          'fixed bottom-4 right-4 z-40',
          'h-14 w-14 rounded-full',
          'bg-primary text-primary-foreground shadow-lg',
          'flex items-center justify-center',
          'transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
          !hasAnimated && !isOpen && 'animate-pulse'
        )}
        aria-label={isOpen ? 'Close chat' : 'Chat with Emma'}
        title={isOpen ? 'Close chat' : 'Chat with Emma'}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </motion.button>
    </>
  );
}

/**
 * Panel header with Emma info and close button.
 * Uses VoiceProvider context to show voice status.
 */
function WidgetPanelHeader({ onClose, companyName }: { onClose: () => void; companyName: string }) {
  const { status } = useVoice();
  const isVoiceActive = status === 'connected' || status === 'connecting';

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary text-primary-foreground rounded-t-2xl">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
          {isVoiceActive ? (
            <AudioLines className="h-4 w-4 animate-pulse" />
          ) : (
            <MessageCircle className="h-4 w-4" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold">Emma</p>
          <p className="text-xs opacity-80">
            {isVoiceActive ? 'Listening...' : companyName}
          </p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="h-8 w-8 rounded-full hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
        aria-label="Close chat"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
