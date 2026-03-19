'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { SectionBaseProps } from '@/lib/section-types';
import { StaggerContainer, StaggerItem } from '@/components/motion';

function str(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function list(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object') : [];
}

export function Testimonials({ branding, config, className }: SectionBaseProps) {
  const companyName = str(branding.name) || 'Go Hard Corporation';
  const serviceArea =
    str(config['serviceArea']) ||
    str(config['service_area']) ||
    'Kitchener, Waterloo, Cambridge, and Guelph';

  const introA =
    str(config['aboutCopy']) ||
    str(config['about_copy']) ||
    `${companyName} keeps your renovation organized, on schedule, and on budget. We handle everything from design and permits to construction and finishing across ${serviceArea}.`;

  const introB =
    str(config['heroSubheadline']) ||
    str(config['hero_subheadline']) ||
    'For nearly a decade, clients have trusted us to transform their homes into spaces that look stunning and function perfectly. Our reviews reflect the care, skill, and dedication our team brings to every detail.';

  const testimonials = list(config['testimonials']).slice(0, 3);
  const portfolio = list(config['portfolio']).slice(0, 2);
  const fallbackTestimonials =
    testimonials.length > 0
      ? testimonials
      : [
          {
            quote:
              'Every step felt deliberate. The site planning, build sequencing, and finishing details were managed with real discipline.',
            author: 'Kitchener Homeowner',
            role: 'Full-home renovation',
          },
          {
            quote:
              'The team protected the budget without flattening the design. We ended up with a home that feels custom in every room.',
            author: 'Waterloo Client',
            role: 'Kitchen and main-floor remodel',
          },
          {
            quote:
              'Communication stayed sharp from permits through final walkthrough. Nothing felt improvised.',
            author: 'Cambridge Family',
            role: 'Addition and interior finishing',
          },
        ];

  const fallbackImageA =
    str(portfolio[0]?.['imageUrl']) ||
    str(portfolio[0]?.['image_url']) ||
    str(config['aboutImageUrl']) ||
    str(config['about_image_url']);
  const fallbackImageB =
    str(portfolio[1]?.['imageUrl']) ||
    str(portfolio[1]?.['image_url']) ||
    str(config['heroImageUrl']) ||
    str(config['hero_image_url']);

  return (
    <section
      className={[
        'relative overflow-hidden bg-[linear-gradient(180deg,rgba(18,18,16,0.96)_0%,rgba(18,18,16,0.92)_44%,rgba(244,240,232,1)_44%,rgba(244,240,232,1)_100%)] text-stone-950',
        className ?? '',
      ].join(' ')}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(180,186,166,0.18),transparent_28%),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[length:auto,32px_32px]" />

      <StaggerContainer className="relative mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <StaggerItem>
            <div className="flex h-full flex-col justify-between">
              <div className="space-y-8 text-stone-100">
                <div className="space-y-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">What Our Clients Say</p>
                  <h2 className="max-w-xl font-['Cormorant_Garamond'] text-[clamp(2.9rem,6vw,5.8rem)] font-semibold uppercase leading-[0.86] tracking-[0.03em] text-stone-50">
                    Structured to feel effortless.
                  </h2>
                </div>

                <div className="grid gap-5 border-l border-white/15 pl-5 md:pl-7">
                  <h3 className="max-w-2xl font-['Raleway'] text-[clamp(1.05rem,1.5vw,1.35rem)] font-light leading-8 text-stone-200">
                    {introA}
                  </h3>
                  <h3 className="max-w-2xl font-['Raleway'] text-[clamp(1.05rem,1.5vw,1.35rem)] font-light leading-8 text-stone-300/95">
                    {introB}
                  </h3>
                </div>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  href="/visualizer"
                  className="inline-flex min-h-14 items-center justify-center bg-primary px-8 font-['proxima-nova'] text-[14px] font-light uppercase tracking-[0.18em] text-primary-foreground transition duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:bg-primary/85"
                >
                  Get Your Free Design Estimate
                </Link>
                <div className="border border-white/15 px-5 py-3 font-['Raleway'] text-sm uppercase tracking-[0.18em] text-stone-300">
                  Nearly a decade of renovations across {serviceArea}
                </div>
              </div>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="grid gap-5 md:grid-cols-[1.15fr_0.85fr]">
              <div className="grid gap-5">
                {fallbackTestimonials.map((item, index) => {
                  const quote = str(item['quote']) || str(item['testimonial']);
                  const author = str(item['author']) || str(item['name']) || `${companyName} Client`;
                  const role = str(item['role']) || str(item['project']) || 'Renovation client';

                  return (
                    <StaggerItem key={`${author}-${index}`}>
                      <article className="group border border-stone-300/70 bg-[rgba(255,252,247,0.9)] p-7 transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)] md:p-8">
                        <div className="mb-6 flex items-center justify-between border-b border-stone-300/80 pb-4">
                          <span className="font-['proxima-nova'] text-[11px] font-light uppercase tracking-[0.28em] text-stone-500">
                            Client Review
                          </span>
                          <span className="font-['Cormorant_Garamond'] text-3xl leading-none text-primary">&ldquo;</span>
                        </div>
                        <p className="font-['Raleway'] text-[1.02rem] leading-8 text-stone-700">{quote}</p>
                        <div className="mt-7">
                          <p className="font-['Cormorant_Garamond'] text-2xl font-semibold uppercase tracking-[0.06em] text-stone-950">
                            {author}
                          </p>
                          <p className="mt-1 font-['proxima-nova'] text-[11px] font-light uppercase tracking-[0.24em] text-stone-500">
                            {role}
                          </p>
                        </div>
                      </article>
                    </StaggerItem>
                  );
                })}
              </div>

              <div className="grid auto-rows-[220px] gap-5 md:auto-rows-[minmax(220px,1fr)]">
                <StaggerItem>
                  <div className="group relative overflow-hidden border border-white/10 bg-stone-900">
                    {fallbackImageA ? (
                      <Image
                        src={fallbackImageA}
                        alt={`${companyName} project`}
                        fill
                        priority={false}
                        className="object-cover transition duration-500 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(180,186,166,0.92),rgba(38,38,35,0.88))]" />
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(18,18,16,0.72))]" />
                    <div className="absolute bottom-0 left-0 right-0 p-5 text-stone-50">
                      <p className="font-['proxima-nova'] text-[11px] font-light uppercase tracking-[0.28em] text-stone-200">
                        Detail-Driven Delivery
                      </p>
                    </div>
                  </div>
                </StaggerItem>

                <StaggerItem>
                  <div className="group relative overflow-hidden border border-stone-300/70 bg-[rgba(255,252,247,0.85)] p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
                    <div className="relative h-full min-h-[220px] overflow-hidden border border-stone-300/70">
                      {fallbackImageB ? (
                        <Image
                          src={fallbackImageB}
                          alt={`${companyName} renovation`}
                          fill
                          priority={false}
                          className="object-cover transition duration-500 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,248,238,1),rgba(180,186,166,0.58))]" />
                      )}
                    </div>
                    <div className="mt-5 border-t border-stone-300/80 pt-4">
                      <p className="font-['Cormorant_Garamond'] text-3xl font-semibold uppercase tracking-[0.05em] text-stone-950">
                        Calm process. Sharp finish.
                      </p>
                      <p className="mt-2 font-['Raleway'] text-sm leading-7 text-stone-600">
                        Design, permits, construction, and finishing managed in one disciplined flow.
                      </p>
                    </div>
                  </div>
                </StaggerItem>
              </div>
            </div>
          </StaggerItem>
        </div>
      </StaggerContainer>
    </section>
  );
}
