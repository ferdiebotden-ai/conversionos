'use client';

import { Phone, Mail, MapPin } from 'lucide-react';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { StaggerContainer, StaggerItem, FadeInUp } from '@/components/motion';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function ContactCards({ branding, config, className }: Props) {
  const cards = [
    {
      icon: Phone,
      label: 'Call Us',
      value: branding.phone,
      href: `tel:${branding.phone}`,
    },
    {
      icon: Mail,
      label: 'Email Us',
      value: branding.email,
      href: `mailto:${branding.email}`,
    },
    {
      icon: MapPin,
      label: 'Visit Us',
      value: `${config.city}, ${config.province}`,
    },
  ].filter((c) => c.value);

  return (
    <section className={`py-16 px-4 sm:px-6 lg:px-8 ${className ?? ''}`}>
      <div className="mx-auto max-w-4xl">
        <FadeInUp>
          <h2 className="text-3xl font-bold tracking-tight text-center mb-10">
            Get in Touch
          </h2>
        </FadeInUp>

        <StaggerContainer className="grid md:grid-cols-3 gap-6">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <StaggerItem key={i}>
                <div className="bg-card rounded-xl p-6 border text-center">
                  <Icon className="size-8 text-primary mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {card.label}
                  </p>
                  {card.href ? (
                    <a
                      href={card.href}
                      className="text-lg font-semibold hover:underline"
                    >
                      {card.value}
                    </a>
                  ) : (
                    <p className="text-lg font-semibold">{card.value}</p>
                  )}
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        <FadeInUp>
          <div className="mt-10 text-center">
            <p className="text-muted-foreground">
              Reach out by phone or email — we&apos;d love to hear about your
              project.
            </p>
            <div className="flex items-center justify-center gap-4 mt-4">
              {branding.phone && (
                <a
                  href={`tel:${branding.phone}`}
                  className="text-primary font-semibold hover:underline"
                >
                  {branding.phone}
                </a>
              )}
              {branding.phone && branding.email && (
                <span className="text-muted-foreground">|</span>
              )}
              {branding.email && (
                <a
                  href={`mailto:${branding.email}`}
                  className="text-primary font-semibold hover:underline"
                >
                  {branding.email}
                </a>
              )}
            </div>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
