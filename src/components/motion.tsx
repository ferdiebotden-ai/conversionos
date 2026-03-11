'use client';

import { type ReactNode, useRef, useState, useEffect } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  fadeInUp,
  fadeIn,
  scaleIn,
  staggerContainer,
  staggerItem,
  slideInLeft,
  slideInRight,
} from '@/lib/animations';

interface MotionProps {
  children: ReactNode;
  className?: string;
}

/** Fade in + slide up when scrolled into view */
export function FadeInUp({ children, className }: MotionProps) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.div
      variants={fadeInUp}
      initial={shouldReduce ? 'visible' : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Simple fade in when scrolled into view */
export function FadeIn({ children, className }: MotionProps) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.div
      variants={fadeIn}
      initial={shouldReduce ? 'visible' : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Scale up + fade in when scrolled into view */
export function ScaleIn({ children, className }: MotionProps) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.div
      variants={scaleIn}
      initial={shouldReduce ? 'visible' : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Container that staggers its children into view */
export function StaggerContainer({ children, className }: MotionProps) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.div
      variants={staggerContainer}
      initial={shouldReduce ? 'visible' : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Individual stagger item — must be inside StaggerContainer */
export function StaggerItem({ children, className }: MotionProps) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

/** Slide in from left or right — for split layouts */
export function SlideInFromSide({ children, className, from = 'left' }: MotionProps & { from?: 'left' | 'right' }) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.div
      variants={from === 'left' ? slideInLeft : slideInRight}
      initial={shouldReduce ? 'visible' : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Parallax scroll effect for hero backgrounds */
export function ParallaxSection({ children, className, offset = 50 }: MotionProps & { offset?: number }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [-offset, offset]);
  const shouldReduce = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      style={shouldReduce ? {} : { y }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Animated number counter for trust metrics */
export function CountUp({ target, duration = 2, className, suffix = '' }: {
  target: number;
  duration?: number;
  className?: string;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    if (!isInView) return;
    if (shouldReduce) {
      setCount(target);
      return;
    }

    let start = 0;
    const step = target / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);

    return () => clearInterval(timer);
  }, [isInView, target, duration, shouldReduce]);

  return <span ref={ref} className={className}>{count}{suffix}</span>;
}
