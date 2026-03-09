'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Star, Briefcase, Clock, Shield } from 'lucide-react';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

interface StatItem {
  icon: React.ReactNode;
  target: number;
  /** Number of decimal places to display (0 for integers) */
  decimals: number;
  suffix: string;
  label: string;
}

function AnimatedNumber({ target, decimals, suffix, inView }: {
  target: number; decimals: number; suffix: string; inView: boolean;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;

    let frame: number;
    const duration = 1500;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(eased * target);
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [inView, target]);

  const display = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();

  return (
    <span>
      {display}
      {suffix}
    </span>
  );
}

export function TrustStatsCounter({ config, className }: Props) {
  const metrics = config.trustMetrics;
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  const observerCallback = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0]?.isIntersecting) setInView(true);
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(observerCallback, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [observerCallback]);

  if (!metrics) return null;

  const items: StatItem[] = [];

  if (metrics.google_rating) {
    const num = parseFloat(metrics.google_rating);
    if (!isNaN(num)) {
      items.push({
        icon: <Star className="mx-auto size-7 fill-yellow-400 text-yellow-400" />,
        target: num,
        decimals: 1,
        suffix: '',
        label: 'Google Rating',
      });
    }
  }

  if (metrics.years_in_business) {
    const num = parseInt(metrics.years_in_business, 10);
    if (!isNaN(num)) {
      items.push({
        icon: <Clock className="mx-auto size-7 text-primary" />,
        target: num,
        decimals: 0,
        suffix: '+',
        label: 'Years in Business',
      });
    }
  }

  if (metrics.projects_completed) {
    const cleaned = metrics.projects_completed.replace(/[^0-9]/g, '');
    const num = parseInt(cleaned, 10);
    if (!isNaN(num)) {
      items.push({
        icon: <Briefcase className="mx-auto size-7 text-primary" />,
        target: num,
        decimals: 0,
        suffix: '+',
        label: 'Projects Completed',
      });
    }
  }

  if (metrics.licensed_insured) {
    items.push({
      icon: <Shield className="mx-auto size-7 text-primary" />,
      target: 100,
      decimals: 0,
      suffix: '%',
      label: 'Licensed & Insured',
    });
  }

  if (items.length === 0) return null;

  return (
    <section ref={sectionRef} className={`py-16 md:py-20 ${className ?? ''}`}>
      <div className="container mx-auto px-4">
        <div className={`grid gap-8 ${items.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
          {items.map((item, i) => (
            <div key={i} className="text-center">
              {item.icon}
              <div className="mt-3 text-4xl font-bold text-primary md:text-5xl">
                <AnimatedNumber
                  target={item.target}
                  decimals={item.decimals}
                  suffix={item.suffix}
                  inView={inView}
                />
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
