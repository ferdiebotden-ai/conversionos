'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import Image from 'next/image';
import Link from 'next/link';
import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn } from '@/components/motion';

export function AboutSection({ branding, config, tokens, className }: SectionBaseProps) {
  function str(v: unknown): string {
    return typeof v === 'string' && v.trim() ? v.trim() : '';
  }

  function rec(v: unknown): Record<string, unknown> {
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  }

  const aboutCopy =
    str(config['aboutCopy']) ||
    str(config['about_copy']) ||
    str(config['aboutText']) ||
    str(config['about_text']);
  const aboutImageUrl = str(config['aboutImageUrl']) || str(config['about_image_url']);
  const logoUrl = str(config['logoUrl']) || str(config['logo_url']) || str(branding.logo_url);
  const serviceArea = str(config['serviceArea']) || str(config['service_area']);
  const whyChooseUsRaw = Array.isArray(config['whyChooseUs']) ? config['whyChooseUs'] : [];
  const whyChooseUs = whyChooseUsRaw.length
    ? whyChooseUsRaw.map((item) => rec(item))
    : [
        { title: 'Clear planning', description: 'Defined scopes and a practical build sequence before work accelerates.' },
        { title: 'Finish discipline', description: 'Materials, trim, and details handled with a quality-first standard.' },
        { title: 'Reliable communication', description: 'Updates that keep decisions moving instead of slowing the project down.' },
      ];
  const tokenCount =
    tokens && typeof tokens === 'object' ? Object.keys(tokens as Record<string, unknown>).length : 0;

  return (
    <section
      id="about"
      data-token-count={tokenCount}
      className={`bg-background py-16 text-foreground md:py-24 ${className ?? ''}`}
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
          <ScaleIn>
            <div className="relative overflow-hidden rounded-[32px] border border-border bg-muted">
              <div className="relative aspect-[4/5]">
                {aboutImageUrl ? (
                  <Image
                    src={aboutImageUrl}
                    alt={branding.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 44vw"
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        'linear-gradient(145deg, oklch(var(--primary) / 0.92), oklch(var(--muted) / 0.94))',
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              </div>

              <div className="absolute left-5 top-5 flex items-center gap-3 rounded-full border border-white/20 bg-white/12 px-4 py-2 backdrop-blur-md">
                <div className="relative h-10 w-10 overflow-hidden rounded-full">
                  {logoUrl ? (
                    <Image src={logoUrl} alt={`${branding.name} logo`} fill className="object-cover" sizes="40px" />
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          'linear-gradient(135deg, oklch(var(--primary) / 0.96), oklch(var(--primary) / 0.72))',
                      }}
                    />
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/70">About</p>
                  <p className="text-sm font-semibold text-white">{branding.name}</p>
                </div>
              </div>
            </div>
          </ScaleIn>

          <FadeIn>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Company Focus</p>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight md:text-5xl">
                A build partner grounded in process, detail, and steady execution.
              </h2>
              <p className="mt-6 max-w-2xl font-body text-base leading-8 text-muted-foreground">
                {aboutCopy ||
                  `${branding.name} combines practical construction knowledge with a finish-conscious approach, helping clients move from idea to completed space with fewer surprises and stronger results.`}
              </p>
              <p className="mt-4 font-body text-base leading-8 text-muted-foreground">
                {serviceArea
                  ? `The team works across ${serviceArea}, tailoring each project around the site, scope, and level of refinement required.`
                  : 'Each phase is organized to keep communication clear, schedules realistic, and craftsmanship visible in the finished work.'}
              </p>

              <StaggerContainer>
                <div className="mt-10 grid gap-4 sm:grid-cols-3">
                  {whyChooseUs.map((item, index) => (
                    <StaggerItem key={`${str(item['title']) || 'reason'}-${index}`}>
                      <div className="rounded-[24px] border border-border bg-muted p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                          {String(index + 1).padStart(2, '0')}
                        </p>
                        <h3 className="mt-3 font-heading text-lg font-semibold">
                          {str(item['title']) || str(item['name']) || 'Why Clients Choose Us'}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">
                          {str(item['description']) ||
                            'Measured planning and quality-focused execution that keep the project moving forward cleanly.'}
                        </p>
                      </div>
                    </StaggerItem>
                  ))}
                </div>
              </StaggerContainer>

              <FadeInUp>
                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/visualizer"
                    className="rounded-full bg-primary px-6 py-3 text-center text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:scale-[1.01]"
                  >
                    Plan Your Project
                  </Link>
                  <Link
                    href="#gallery"
                    className="rounded-full border border-border px-6 py-3 text-center text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-muted"
                  >
                    View Recent Work
                  </Link>
                </div>
              </FadeInUp>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
