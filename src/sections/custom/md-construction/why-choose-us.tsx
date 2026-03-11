'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import Image from 'next/image';
import Link from 'next/link';
import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn } from '@/components/motion';

export function WhyChooseUs({ branding, config: rawConfig, tokens, className }: SectionBaseProps) {
  void tokens;
  const config = rawConfig as unknown as Record<string, unknown>;
  function str(v: unknown): string { return typeof v === 'string' && v.trim() ? v.trim() : ''; }
  function records(v: unknown): Record<string, unknown>[] {
    return Array.isArray(v) ? v.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null) : [];
  }
  const whyChooseUs = Array.isArray(config['whyChooseUs']) ? config['whyChooseUs'] : [];
  const testimonials = records(config['testimonials']);
  const heroImageUrl = str(config['heroImageUrl']) || str(config['hero_image_url']);
  const serviceArea = str(config['serviceArea']) || str(config['service_area']) || branding.address || 'the local area';
  const trustMetrics = config['trustMetrics'] && typeof config['trustMetrics'] === 'object' ? (config['trustMetrics'] as Record<string, unknown>) : null;
  const features = whyChooseUs.length
    ? whyChooseUs.slice(0, 4).map((item, index) => ({
        title:
          typeof item === 'string'
            ? item
            : str((item as Record<string, unknown>)['title']) ||
              str((item as Record<string, unknown>)['name']) ||
              `Reason ${index + 1}`,
        description:
          typeof item === 'string'
            ? 'A practical advantage clients notice throughout the project.'
            : str((item as Record<string, unknown>)['description']) ||
              'A practical advantage clients notice throughout the project.',
      }))
    : [
        { title: 'Clear communication', description: 'Updates stay direct and timely so expectations remain aligned.' },
        { title: 'Durable workmanship', description: 'Materials and finishing decisions are made for long-term performance.' },
        { title: 'Respectful job sites', description: 'Projects run with care for the property, the schedule, and the people around the work.' },
        { title: 'Practical planning', description: `Every recommendation is grounded in real build conditions across ${serviceArea}.` },
      ];
  const metrics = trustMetrics
    ? Object.entries(trustMetrics)
        .slice(0, 3)
        .map(([label, value]) => ({
          label: label.replace(/([a-z])([A-Z])/g, '$1 $2'),
          value: str(value) || String(value ?? ''),
        }))
        .filter((item) => item.value)
    : [
        { label: 'Service area', value: serviceArea },
        { label: 'Contact', value: branding.phone || branding.email || 'Responsive support' },
        { label: 'Project focus', value: 'Planning through completion' },
      ];
  const featuredTestimonial = testimonials[0];
  const quote =
    str(featuredTestimonial?.['quote']) ||
    str(featuredTestimonial?.['testimonial']) ||
    'Clients trust the process because the work is organized, the communication is honest, and the final result feels finished.';
  const author = str(featuredTestimonial?.['name']) || str(featuredTestimonial?.['author']) || `${branding.name} clients`;
  return (
    <section className={`bg-background py-14 md:py-20 ${className ?? ''}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <StaggerContainer className="max-w-2xl">
            <FadeInUp>
              <p className="font-body text-sm uppercase tracking-[0.28em] text-primary">Why Choose Us</p>
            </FadeInUp>
            <FadeInUp>
              <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground md:text-5xl">
                Confidence built into the way every project is delivered
              </h2>
            </FadeInUp>
            <FadeIn>
              <p className="mt-4 font-body text-base leading-8 text-muted-foreground">
                {branding.name} combines practical field experience with clear client communication so the work feels well-managed from the start.
              </p>
            </FadeIn>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {metrics.map((item) => (
                <ScaleIn key={`${item.label}-${item.value}`}>
                  <div className="rounded-[22px] border border-border bg-muted/40 px-5 py-5">
                    <p className="font-heading text-2xl font-semibold text-foreground">{item.value}</p>
                    <p className="mt-2 font-body text-sm text-muted-foreground">{item.label}</p>
                  </div>
                </ScaleIn>
              ))}
            </div>
            <ScaleIn>
              <div className="mt-8 overflow-hidden rounded-[28px] border border-border bg-slate-950 text-white">
                <div className="grid gap-0 md:grid-cols-[0.8fr_1.2fr]">
                  <div className="relative min-h-[220px]">
                    {heroImageUrl ? (
                      <Image
                        src={heroImageUrl}
                        alt={branding.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 30vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-primary/60 to-slate-900/95" />
                    )}
                    <div className="absolute inset-0 bg-slate-950/30" />
                  </div>
                  <div className="p-6 md:p-8">
                    <p className="font-body text-xs uppercase tracking-[0.24em] text-white/60">Client perspective</p>
                    <p className="mt-4 font-heading text-2xl leading-9 text-white">"{quote}"</p>
                    <p className="mt-4 font-body text-sm text-white/70">{author}</p>
                  </div>
                </div>
              </div>
            </ScaleIn>
          </StaggerContainer>
          <StaggerContainer className="grid gap-4 sm:grid-cols-2">
            {features.map((feature, index) => (
              <StaggerItem key={`${feature.title}-${index}`}>
                <article className="h-full rounded-[28px] border border-border bg-card p-6 shadow-sm transition-transform duration-300 hover:scale-[1.02]">
                  <p className="font-body text-xs uppercase tracking-[0.24em] text-primary">
                    Advantage {String(index + 1).padStart(2, '0')}
                  </p>
                  <h3 className="mt-4 font-heading text-2xl font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-3 font-body text-base leading-7 text-muted-foreground">{feature.description}</p>
                </article>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
        <FadeInUp>
          <div className="mt-8 flex flex-col gap-4 rounded-[28px] bg-primary px-6 py-7 text-primary-foreground md:flex-row md:items-center md:justify-between">
            <p className="font-body text-base text-primary-foreground/85">
              Start with a concept, selections, or a rough idea and turn it into a clear next step.
            </p>
            <Link
              href="/visualizer"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary transition-transform duration-200 hover:scale-[1.02]"
            >
              Get Your Free Design Estimate
            </Link>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
