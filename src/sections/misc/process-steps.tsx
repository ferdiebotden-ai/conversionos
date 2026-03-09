'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { FadeInUp, StaggerContainer, StaggerItem } from '@/components/motion';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function MiscProcessSteps({ config, className }: Props) {
  const steps = config.processSteps;
  if (!steps || steps.length === 0) return null;

  return (
    <section className={`py-12 md:py-20 ${className ?? ''}`}>
      <div className="mx-auto max-w-6xl px-4">
        <FadeInUp>
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
            How It Works
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
            A simple process to transform your space
          </p>
        </FadeInUp>

        <StaggerContainer className="relative mt-10 grid gap-8 md:grid-cols-3">
          {/* Connector line (desktop only) */}
          <div className="absolute left-[16.67%] right-[16.67%] top-8 hidden border-t-2 border-dashed border-muted-foreground/20 md:block" />

          {steps.map((step, i) => (
            <StaggerItem key={i}>
              <div className="relative flex flex-col items-center text-center">
                {/* Step number circle */}
                <div className="flex size-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
