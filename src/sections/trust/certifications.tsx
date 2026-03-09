'use client';

import { Shield, Award } from 'lucide-react';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { StaggerContainer, StaggerItem } from '@/components/motion';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

function getCertIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('award') || lower.includes('renomark') || lower.includes('best')) {
    return Award;
  }
  return Shield;
}

export function TrustCertifications({ branding, config, className }: Props) {
  if (!config.certifications || config.certifications.length === 0) return null;

  return (
    <section className={`py-12 md:py-16 ${className ?? ''}`}>
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Certifications & Memberships
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            {branding.name} is proud to hold these industry certifications.
          </p>
        </div>

        <StaggerContainer className="flex flex-wrap justify-center gap-4">
          {config.certifications.map((cert) => {
            const Icon = getCertIcon(cert);
            return (
              <StaggerItem key={cert}>
                <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground shadow-sm">
                  <Icon className="size-4 text-primary" />
                  <span>{cert}</span>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}
