'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Maximize2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface RenderingPanelProps {
  imageUrl: string | null;
  isGenerating: boolean;
  refinementCount: number;
  maxRefinements: number;
  signalSummary: string | null;
  onEnlarge: () => void;
  /** Compact mode for mobile layout */
  compact?: boolean;
}

export function RenderingPanel({
  imageUrl,
  isGenerating,
  refinementCount,
  maxRefinements,
  signalSummary,
  onEnlarge,
  compact = false,
}: RenderingPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (!imageUrl) return null;

  const refinementLabel =
    refinementCount >= maxRefinements
      ? `${maxRefinements}/${maxRefinements} Refined`
      : refinementCount > 0
        ? `Refined (${refinementCount}/${maxRefinements})`
        : 'Your starred concept';

  // ── Compact (mobile) layout ───────────────────────────────────────────────
  if (compact) {
    return (
      <div className="rounded-lg border border-border bg-card">
        <div className="flex w-full items-center justify-between px-3 py-2">
          <button
            type="button"
            className="flex flex-1 items-center gap-2 text-left"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
            <span className="text-sm font-medium">Your Vision</span>
            {refinementCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {refinementLabel}
              </Badge>
            )}
            {collapsed ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
            ) : (
              <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" />
            )}
          </button>
          <button
            type="button"
            className="p-1 rounded hover:bg-muted ml-1"
            onClick={onEnlarge}
            aria-label="Enlarge rendering"
          >
            <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex gap-3 px-3 pb-3">
                <div className="relative h-[60px] w-[80px] flex-shrink-0 overflow-hidden rounded-md">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={imageUrl}
                      src={imageUrl}
                      alt="Your design concept"
                      className="h-full w-full object-cover"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                    />
                  </AnimatePresence>
                  {isGenerating && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-md">
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isGenerating
                    ? 'Refining your vision...'
                    : signalSummary
                      ? `Refined based on your ${signalSummary} preferences`
                      : 'Your starred design concept'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Desktop layout ────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          <span className="text-sm font-medium">Your Vision</span>
        </div>
        <div className="flex items-center gap-2">
          {refinementCount > 0 && (
            <Badge
              variant={refinementCount >= maxRefinements ? 'outline' : 'secondary'}
              className="text-xs"
            >
              {refinementLabel}
            </Badge>
          )}
          <button
            type="button"
            className="p-1 rounded hover:bg-muted transition-colors"
            onClick={onEnlarge}
            aria-label="Enlarge rendering"
          >
            <Maximize2 className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div
        className={`relative overflow-hidden rounded-lg ${
          isGenerating ? 'animate-pulse' : ''
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={imageUrl}
            src={imageUrl}
            alt="Your design concept"
            className="h-48 w-full object-cover rounded-lg cursor-pointer"
            onClick={onEnlarge}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        </AnimatePresence>

        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
            <div className="flex items-center gap-2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
              <Loader2 className="h-3 w-3 animate-spin" />
              Refining your vision...
            </div>
          </div>
        )}
      </div>

      {signalSummary && !isGenerating && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          Based on your {signalSummary} preferences
        </p>
      )}
    </div>
  );
}

// ── Enlarged dialog ─────────────────────────────────────────────────────────

export interface RenderingEnlargedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  signalSummary: string | null;
  refinementCount: number;
  maxRefinements: number;
}

export function RenderingEnlargedDialog({
  open,
  onOpenChange,
  imageUrl,
  signalSummary,
  refinementCount,
  maxRefinements,
}: RenderingEnlargedDialogProps) {
  if (!imageUrl) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            Your Design Vision
            {refinementCount > 0 && (
              <Badge variant="secondary" className="text-xs ml-2">
                {refinementCount >= maxRefinements
                  ? `${maxRefinements}/${maxRefinements} Refined`
                  : `Refined ${refinementCount}/${maxRefinements}`}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Full-size view of your refined design concept
          </DialogDescription>
        </DialogHeader>
        <img
          src={imageUrl}
          alt="Your refined design concept"
          className="w-full rounded-lg"
        />
        {signalSummary && (
          <p className="text-sm text-muted-foreground">
            Refined based on: {signalSummary}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
