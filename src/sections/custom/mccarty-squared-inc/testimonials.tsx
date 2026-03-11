'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import Image from 'next/image';
import Link from 'next/link';
import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn } from '@/components/motion';

export function Testimonials({ branding, config, tokens, className }: SectionBaseProps) {
  void tokens;

  function str(v: unknown): string {
    return typeof v === 'string' && v.trim() ? v.trim() : '';
  }

  const testimonials = Array.isArray(config['testimonials']) ? config['testimonials'] : [];
  const aboutImageUrl = str(config['aboutImageUrl']) || str(config['about_image_url']);
  const serviceArea = str(config['serviceArea']) || str(config['service_area']);

  const reviewItems =
    testimonials.length > 0
      ? (testimonials as Record<string, unknown>[])
      : [
          {
            name: 'Project Client',
            quote: `${branding.name} kept the job organized, communicated clearly, and delivered a result that feels built to last.`,
          },
          {
            name: 'Homeowner',
            quote: 'The process stayed clean and predictable, and the final workmanship exceeded expectations.',
          },
          {
            name: 'Repeat Customer',
            quote: 'Professional, responsive, and detail-oriented from the first walkthrough to the final handoff.',
          },
        ];

  return (
    <section className={`bg-background py-14 md:py-20 ${className ?? ''}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <p className="font-body text-sm uppercase tracking-[0.28em] text-primary">
            {serviceArea || 'Client Feedback'}
          </p>
        </FadeIn>
        <FadeInUp>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
                Confidence built through the work itself
              </h2>
              <p className="mt-4 font-body text-base leading-7 text-muted-foreground md:text-lg">
                Reviews that reflect how {branding.name} handles communication, timelines, and finish quality.
              </p>
            </div>
            <Link
              href="/visualizer"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:scale-[1.02]"
            >
              Get Your Free Design Estimate
            </Link>
          </div>
        </FadeInUp>

        <StaggerContainer className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <div className="grid gap-6 md:grid-cols-2">
            {reviewItems.slice(0, 4).map((testimonial, index) => (
              <StaggerItem key={`${str(testimonial['name'])}-${index}`}>
                <ScaleIn>
                  <article className="flex h-full flex-col justify-between rounded-[1.75rem] border border-border bg-card p-6 shadow-sm">
                    <p className="font-body text-base leading-7 text-foreground">
                      "{str(testimonial['quote']) || str(testimonial['review']) || 'Thoughtful planning and strong execution made the entire experience easier.'}"
                    </p>
                    <div className="mt-8 border-t border-border pt-4">
                      <p className="font-heading text-lg font-semibold text-foreground">
                        {str(testimonial['name']) || `Client ${index + 1}`}
                      </p>
                      <p className="mt-1 font-body text-sm text-muted-foreground">
                        {str(testimonial['title']) || 'Verified project experience'}
                      </p>
                    </div>
                  </article>
                </ScaleIn>
              </StaggerItem>
            ))}
          </div>

          <StaggerItem>
            <div className="relative min-h-[360px] overflow-hidden rounded-[2rem] border border-border">
              {aboutImageUrl ? (
                <Image src={aboutImageUrl} alt={branding.name} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 40vw" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/70" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-8">
                <p className="font-body text-xs uppercase tracking-[0.24em] text-white/70">What clients notice</p>
                <h3 className="mt-3 font-heading text-2xl font-semibold md:text-3xl">
                  Responsive planning. Reliable execution. Refined results.
                </h3>
                <p className="mt-4 font-body text-sm leading-6 text-white/80">
                  The strongest testimonials usually point to the same thing: the work feels organized long before the project is finished.
                </p>
              </div>
            </div>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </section>
  );
}
