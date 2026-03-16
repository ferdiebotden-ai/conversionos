'use client';

/**
 * Floating Generate Button
 * Sticky "Generate My Vision" CTA that appears when room + style are selected
 * Animates in from below with Framer Motion
 */

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface FloatingGenerateButtonProps {
  visible: boolean;
  onClick: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
}

export function FloatingGenerateButton({
  visible,
  onClick,
  disabled = false,
  isGenerating = false,
}: FloatingGenerateButtonProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className={cn(
            'sticky bottom-4 z-20',
            'flex justify-center',
            'px-4 py-2',
            'pointer-events-none'
          )}
        >
          <Button
            onClick={onClick}
            disabled={disabled || isGenerating}
            size="lg"
            className={cn(
              'pointer-events-auto',
              'min-h-[52px] w-full max-w-[400px]',
              'rounded-full text-base font-semibold',
              'bg-primary hover:bg-primary/90 text-primary-foreground',
              'shadow-lg shadow-primary/25',
              'transition-all',
              (disabled || isGenerating) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="ml-2">Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                <span className="ml-2">Generate My Vision</span>
              </>
            )}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
