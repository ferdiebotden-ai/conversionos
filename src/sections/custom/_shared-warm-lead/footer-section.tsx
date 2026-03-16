'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { SectionBaseProps } from '@/lib/section-types';

interface StatItem {
  value: number;
  suffix: string;
  label: string;
}

function useCountUp(target: number, duration: number, active: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;

    let startTime: number | null = null;
    let frameId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration, active]);

  return count;
}

function StatCounter({
  item,
  active,
  delay,
}: {
  item: StatItem;
  active: boolean;
  delay: number;
}) {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const count = useCountUp(item.value, 2000, shouldAnimate);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setShouldAnimate(true), delay);
    return () => clearTimeout(timer);
  }, [active, delay]);

  return (
    <div className="flex flex-col items-center px-4 py-4">
      <span className="font-heading text-4xl font-bold text-primary-foreground md:text-5xl">
        {shouldAnimate ? count : 0}
        {item.suffix}
      </span>
      <span className="mt-2 font-body text-sm uppercase tracking-wider text-primary-foreground/70">
        {item.label}
      </span>
    </div>
  );
}

export function WarmLeadFooter({ config, className }: SectionBaseProps) {
  const c = (config ?? {}) as Record<string, unknown>;
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const handleIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry?.isIntersecting) {
      requestAnimationFrame(() => setIsVisible(true));
    }
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(handleIntersect, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleIntersect]);

  // Compute stats from config
  const foundedYear =
    c['founded_year'] ?? c['foundedYear'] ?? c['yearFounded'] ?? c['year_founded'] ?? null;
  const currentYear = new Date().getFullYear();
  const yearsExperience = foundedYear ? currentYear - Number(foundedYear) : 30;

  const projectCount = Number(
    c['projectCount'] ?? c['project_count'] ?? c['projectsCompleted'] ?? c['projects_completed'] ?? 100,
  );
  const googleRating = Number(
    c['googleRating'] ?? c['google_rating'] ?? c['rating'] ?? 5,
  );

  const stats: StatItem[] = [
    { value: yearsExperience, suffix: '+', label: 'Years Experience' },
    { value: projectCount, suffix: '+', label: 'Projects Completed' },
    { value: googleRating, suffix: '\u2605', label: 'Google Rating' },
    { value: 100, suffix: '%', label: 'Licensed & Insured' },
  ];

  return (
    <section
      ref={sectionRef}
      className={['w-full bg-primary py-14 md:py-20', className].filter(Boolean).join(' ')}
      aria-label="Company statistics"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-4">
          {stats.map((item, idx) => (
            <StatCounter
              key={item.label}
              item={item}
              active={isVisible}
              delay={idx * 150}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
