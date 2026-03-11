'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import Image from 'next/image';
import Link from 'next/link';
import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn } from '@/components/motion';

export function AboutSection({ branding, config, tokens, className }: SectionBaseProps) {
  void tokens;

  function str(v: unknown): string {
    return typeof v === 'string' && v.trim() ? v.trim() : '';
  }

  function records(v: unknown): Record<string, unknown>[] {
    return Array.isArray(v)
      ? v.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      : [];
  }

  const aboutText = str(config['aboutText']) || str(config['about_text']);
  const aboutCopy = str(config['aboutCopy']) || str(config['about_copy']) || aboutText;
  const aboutImageUrl = str(config['aboutImageUrl']) || str(config['about_image_url']);
  const heroHeadline = str(config['heroHeadline']) || str(config['hero_headline']);
  const serviceArea = str(config['serviceArea']) || str(config['service_area']) || branding.address || 'your community';
  const whyChooseUs = Array.isArray(config['whyChooseUs']) ? config['whyChooseUs'] : [];
  const services = records(config['services']);

  const pillars = whyChooseUs.length
    ? whyChooseUs
        .map((item) =>
          typeof item === 'string'
            ? item
            : str((item as Record<string, unknown>)['title']) || str((item as Record<string, unknown>)['name']),
        )
        .filter(Boolean)
        .slice(0, 4)
    : services
        .slice(0, 4)
        .map((service) => str(service['name']))
        .filter(Boolean);

  const featureList = pillars.length ? pillars : ['Clear project planning', 'Dependable scheduling', 'Durable materials', 'Respectful on-site crews'];

  return (
    <section className={`bg-muted/40 py-14 md:py-20 ${className ?? ''}`}>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <FadeIn>
          <div className="relative overflow-hidden rounded-[30px]">
            <div className="relative aspect-[4/5] w-full overflow-hidden">
              {aboutImageUrl ? (
                <Image
                  src={aboutImageUrl}
                  alt={branding.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 45vw"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-primary/60 to-slate-900/90" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
            </div>
            <ScaleIn>
              <div className="absolute bottom-5 left-5 right-5 rounded-[24px] border border-white/15 bg-white/10 p-5 text-white backdrop-blur-md">
                <p className="font-body text-xs uppercase tracking-[0.24em] text-white/70">Service area</p>
                <p className="mt-2 font-heading text-2xl font-semibold">{serviceArea}</p>
                <p className="mt-2 font-body text-sm text-white/80">
                  {branding.phone || branding.email || 'Reach out for estimates, site reviews, and project planning.'}
                </p>
              </div>
            </ScaleIn>
          </div>
        </FadeIn>

        <StaggerContainer className="flex flex-col justify-center">
          <FadeInUp>
            <p className="font-body text-sm uppercase tracking-[0.3em] text-primary">About {branding.name}</p>
          </FadeInUp>
          <FadeInUp>
            <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              {heroHeadline || 'Built around solid communication and dependable craftsmanship'}
            </h2>
          </FadeInUp>
          <FadeIn>
            <p className="mt-5 max-w-2xl font-body text-base leading-8 text-muted-foreground">
              {aboutCopy ||
                `${branding.name} approaches each project with disciplined site management, practical recommendations, and a finish that feels complete from every angle.`}
            </p>
          </FadeIn>

          <StaggerContainer className="mt-8 grid gap-4 sm:grid-cols-2">
            {featureList.map((item, index) => (
              <StaggerItem key={`${item}-${index}`}>
                <div className="rounded-[22px] border border-border bg-background px-5 py-5 shadow-sm">
                  <p className="font-body text-xs uppercase tracking-[0.24em] text-primary">
                    {String(index + 1).padStart(2, '0')}
                  </p>
                  <p className="mt-3 font-heading text-xl font-semibold text-foreground">{item}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <FadeInUp>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/visualizer"
                className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:scale-[1.02]"
              >
                Get Your Free Design Estimate
              </Link>
              <div className="inline-flex items-center rounded-full border border-border bg-background px-5 py-3 text-sm text-muted-foreground">
                {branding.address || 'Serving residential and commercial clients with tailored build support.'}
              </div>
            </div>
          </FadeInUp>
        </StaggerContainer>
      </div>
    </section>
  );
}
