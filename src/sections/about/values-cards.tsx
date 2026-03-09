'use client';

import {
  Heart,
  Shield,
  Star,
  Target,
  Users,
  Lightbulb,
  Award,
  Hammer,
  type LucideIcon,
} from 'lucide-react';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { StaggerContainer, StaggerItem } from '@/components/motion';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

const ICON_MAP: Record<string, LucideIcon> = {
  heart: Heart,
  shield: Shield,
  star: Star,
  target: Target,
  users: Users,
  lightbulb: Lightbulb,
  award: Award,
  hammer: Hammer,
};

function resolveIcon(hint: string): LucideIcon {
  const key = hint.toLowerCase().replace(/[-_\s]/g, '');
  for (const [k, v] of Object.entries(ICON_MAP)) {
    if (key.includes(k)) return v;
  }
  return Star;
}

export function AboutValuesCards({ branding, config, className }: Props) {
  const values = config.values;
  if (!values || values.length === 0) return null;

  return (
    <section className={`py-16 px-4 sm:px-6 lg:px-8 ${className ?? ''}`}>
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold tracking-tight text-center mb-10">
          Our Values
        </h2>

        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {values.map((value, i) => {
            const Icon = resolveIcon(value.iconHint);
            return (
              <StaggerItem key={i}>
                <div className="bg-card rounded-xl p-6 border h-full">
                  <Icon className="size-8 text-primary mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}
