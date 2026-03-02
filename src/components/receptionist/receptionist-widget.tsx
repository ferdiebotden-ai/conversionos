'use client';

/**
 * Receptionist Widget
 * Single FAB chat widget with text/voice mode toggle inside the panel
 * Features Emma, the virtual receptionist
 * Animated with Framer Motion spring physics
 */

import { useState, useEffect, useCallback, Component, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MessageCircle, X } from 'lucide-react';
import { ReceptionistChat } from './receptionist-chat';
import { panelSpring } from '@/lib/animations';
import { useBranding } from '@/components/branding-provider';

/** Pages where the widget is hidden (these have their own AI chat) */
const HIDDEN_PATHS = ['/estimate', '/visualizer'];
const HIDDEN_PREFIXES = ['/admin'];

export function ReceptionistWidget() {
  const branding = useBranding();
  const pathname = usePathname();
  const shouldReduce = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Determine visibility
  const isHidden =
    HIDDEN_PATHS.includes(pathname) ||
    HIDDEN_PREFIXES.some(p => pathname.startsWith(p));

  // Pulse animation on first load (3s)
  useEffect(() => {
    if (hasAnimated) return;
    const timer = setTimeout(() => setHasAnimated(true), 3000);
    return () => clearTimeout(timer);
  }, [hasAnimated]);

  const handleFABClick = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  if (isHidden) return null;

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
              'fixed right-4 z-50',
              'w-[calc(100vw-2rem)] max-w-[400px] h-[520px]',
              'bg-background rounded-2xl shadow-2xl border border-border',
              'flex flex-col overflow-hidden'
            )}
            style={{ bottom: 'calc(5rem + var(--mobile-cta-bar-height, 0px))' }}
          >
            <WidgetPanelHeader onClose={() => setIsOpen(false)} companyName={branding.name} />
            <div className="flex-1 min-h-0">
              <ChatErrorBoundary>
                <ReceptionistChat />
              </ChatErrorBoundary>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Single FAB */}
      <motion.button
        onClick={handleFABClick}
        {...(!shouldReduce && { whileHover: { scale: 1.08 }, whileTap: { scale: 0.92 } })}
        className={cn(
          'fixed right-4 z-50',
          'h-14 w-14 rounded-full',
          'bg-primary text-primary-foreground shadow-lg',
          'flex items-center justify-center',
          'transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
          !hasAnimated && !isOpen && 'animate-pulse'
        )}
        style={{ bottom: 'calc(1rem + var(--mobile-cta-bar-height, 0px))' }}
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

/** Error boundary for the chat panel — prevents API failures from crashing the widget. */
class ChatErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full items-center justify-center p-6 text-center">
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Something went wrong — tap to retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Panel header with Emma info and close button. */
function WidgetPanelHeader({ onClose, companyName }: { onClose: () => void; companyName: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary text-primary-foreground rounded-t-2xl">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
          <MessageCircle className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">Emma</p>
          <p className="text-xs opacity-80">{companyName}</p>
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
