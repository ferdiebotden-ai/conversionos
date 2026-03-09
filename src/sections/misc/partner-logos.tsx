'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { FadeInUp, StaggerContainer, StaggerItem } from '@/components/motion';
import { Award, Shield, CheckCircle } from 'lucide-react';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

function getBadgeIcon(hint: string) {
  const lower = hint.toLowerCase();
  if (lower.includes('shield') || lower.includes('insur')) return Shield;
  if (lower.includes('check') || lower.includes('verif')) return CheckCircle;
  return Award;
}

export function MiscPartnerLogos({ config, className }: Props) {
  const certs = config.certifications ?? [];
  const badges = config.trustBadges ?? [];

  if (certs.length === 0 && badges.length === 0) return null;

  return (
    <section className={`py-12 md:py-16 ${className ?? ''}`}>
      <div className="mx-auto max-w-5xl px-4">
        <FadeInUp>
          <h2 className="text-center text-2xl font-bold tracking-tight md:text-3xl">
            Certifications &amp; Trust
          </h2>
        </FadeInUp>

        <StaggerContainer className="mt-8 flex flex-wrap justify-center gap-4 md:gap-6">
          {certs.map((cert) => (
            <StaggerItem key={cert}>
              <div className="flex items-center gap-2 rounded-lg border bg-background px-6 py-3 shadow-sm">
                <Award className="size-5 shrink-0 text-primary" />
                <span className="text-sm font-medium">{cert}</span>
              </div>
            </StaggerItem>
          ))}

          {badges.map((badge) => {
            const Icon = getBadgeIcon(badge.iconHint);
            return (
              <StaggerItem key={badge.label}>
                <div className="flex items-center gap-2 rounded-lg border bg-background px-6 py-3 shadow-sm">
                  <Icon className="size-5 shrink-0 text-primary" />
                  <span className="text-sm font-medium">{badge.label}</span>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}
