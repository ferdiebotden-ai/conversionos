'use client';

/**
 * useSliderMotion — MotionValue-based slider interaction hook
 *
 * Uses Framer Motion MotionValue instead of useState for the slider position,
 * enabling zero React re-renders during drag. Critical for driving 32+
 * fragment transforms at 60fps in the teardown hero animation.
 *
 * The position MotionValue (0-100) can be subscribed to via useTransform
 * or useMotionValueEvent without triggering component re-renders.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  useMotionValue,
  animate,
  type MotionValue,
  type AnimationPlaybackControls,
} from 'framer-motion';

interface UseSliderMotionOptions {
  /** Starting position (0-100). Default: 0 */
  initialPosition?: number;
  /** Skip intro animation and set position immediately. Default: false */
  reducedMotion?: boolean;
  /** Delay before intro animation starts (ms). Default: 1800 */
  introDelay?: number;
  /** Duration of the sweep animation (seconds). Default: 12 */
  introDuration?: number;
  /** Custom cubic-bezier easing. Default: cinematic slow-start */
  introEase?: [number, number, number, number];
}

interface UseSliderMotionReturn {
  /** Slider position 0-100. MotionValue — never triggers React re-renders. */
  position: MotionValue<number>;
  /** True while the user is actively dragging. React state (toggles infrequently). */
  isDragging: boolean;
  /** True after the intro animation completes. React state. */
  showLabels: boolean;
  /** Ref to attach to the slider track element for position calculation. */
  trackRef: React.RefObject<HTMLDivElement | null>;
  /** Event handlers to attach to the slider track element. */
  handlers: {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
  };
  /** Run the intro animation (hold → cinematic sweep 0 → 100). Returns when complete. */
  runIntroAnimation: () => Promise<void>;
  /** Cancel any running animation and mark as user-interrupted. */
  cancelAnimation: () => void;
}

export function useSliderMotion(
  options: UseSliderMotionOptions = {}
): UseSliderMotionReturn {
  const {
    initialPosition = 0,
    reducedMotion = false,
    introDelay = 300,
    introDuration = 10,
    introEase = [0.25, 0.65, 0.45, 1.0],
  } = options;

  const position = useMotionValue(reducedMotion ? 90 : initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [showLabels, setShowLabels] = useState(reducedMotion);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const cancelledRef = useRef(false);
  const controlsRef = useRef<AnimationPlaybackControls | null>(null);

  // ── Position calculation from pointer ────────────────────────────
  const updatePositionFromClient = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = Math.min(Math.max((x / rect.width) * 100, 0), 100);
      position.set(pct);
    },
    [position]
  );

  // ── Cancel animation ─────────────────────────────────────────────
  const cancelAnimation = useCallback(() => {
    cancelledRef.current = true;
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
  }, []);

  // ── Intro animation: hold → slow cinematic sweep → settle ────────
  const runIntroAnimation = useCallback(async () => {
    cancelledRef.current = false;

    // Phase 1: Hold on "before" state so user absorbs the original
    await new Promise((r) => setTimeout(r, introDelay));
    if (cancelledRef.current) return;

    // Phase 2: Slow cinematic sweep 0 → 100
    await new Promise<void>((resolve) => {
      const ctrl = animate(position, 100, {
        duration: introDuration,
        ease: introEase,
        onComplete: resolve,
      });
      controlsRef.current = ctrl;
      if (cancelledRef.current) ctrl.stop();
    });
    if (cancelledRef.current) return;

    controlsRef.current = null;
    setShowLabels(true);
  }, [position, introDelay, introDuration, introEase]);

  // ── Mouse events ─────────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      cancelAnimation();
      setIsDragging(true);
      setShowLabels(true);
      updatePositionFromClient(e.clientX);
    },
    [cancelAnimation, updatePositionFromClient]
  );

  // ── Touch events ─────────────────────────────────────────────────
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      cancelAnimation();
      setIsDragging(true);
      setShowLabels(true);
      const touch = e.touches[0];
      if (touch) updatePositionFromClient(touch.clientX);
    },
    [cancelAnimation, updatePositionFromClient]
  );

  // ── Keyboard ─────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const current = position.get();
      let newPos = current;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          newPos = Math.min(current + 5, 100);
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          newPos = Math.max(current - 5, 0);
          break;
        case 'Home':
          newPos = 0;
          break;
        case 'End':
          newPos = 100;
          break;
        default:
          return;
      }
      e.preventDefault();
      cancelAnimation();
      setShowLabels(true);
      position.set(newPos);
    },
    [position, cancelAnimation]
  );

  // ── Global mouse/touch listeners while dragging ──────────────────
  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => updatePositionFromClient(e.clientX);
    const onMouseUp = () => setIsDragging(false);
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) updatePositionFromClient(touch.clientX);
    };
    const onTouchEnd = () => setIsDragging(false);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, updatePositionFromClient]);

  return {
    position,
    isDragging,
    showLabels,
    trackRef,
    handlers: {
      onMouseDown: handleMouseDown,
      onTouchStart: handleTouchStart,
      onKeyDown: handleKeyDown,
    },
    runIntroAnimation,
    cancelAnimation,
  };
}
