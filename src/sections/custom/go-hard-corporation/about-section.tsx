'use client';

import Image from 'next/image';
import Link from 'next/link';

import { FadeIn, SlideInFromSide } from '@/components/motion';
import type { SectionBaseProps } from '@/lib/section-types';

function str(v: unknown): string {
  return typeof v === 'string' && v.trim() ? v.trim() : '';
}

function splitParagraphs(value: string): string[] {
  return value
    .split(/\n{2,}|\r\n\r\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function AboutSection({ branding, config, className }: SectionBaseProps) {
  const c = config as unknown as Record<string, unknown>;
  const companyName = str(branding.name) || 'Go Hard Corporation';
  const aboutText =
    str(c['aboutCopy']) ||
    str(c['about_copy']) ||
    str(c['aboutText']) ||
    str(c['about_text']);
  const aboutImage =
    str(c['aboutImageUrl']) || str(c['about_image_url']);

  const fallbackHeadline =
    'Your home is a true collection of what you love and a story of who you are.';
  const fallbackParagraphs = [
    'We believe your home should feel like you. Every renovation starts with listening to your needs, your style, and how you live. Our team designs and builds spaces that make your everyday life better.',
    'Built on family values, we focus on honesty, communication, and care in everything we do. Our goal is to earn your trust through reliable service and lasting results.',
    'We have brought together a dedicated team of renovation experts, designers, and skilled general contractors who take pride in their work. Every project is managed by our in-house specialists and supported by trusted local professionals who share our commitment to quality.',
  ];

  const parsedParagraphs = splitParagraphs(aboutText);
  const headline = parsedParagraphs.length > 0 ? parsedParagraphs[0]! : fallbackHeadline;
  const bodyParagraphs =
    parsedParagraphs.length > 1 ? parsedParagraphs.slice(1, 4) : fallbackParagraphs;

  const pillars = [
    'Deep listening before design begins',
    'In-house oversight with dependable trades',
    'Clear communication from first sketch to final handoff',
  ];

  return (
    <section
      className={[
        'relative overflow-hidden bg-stone-950 text-stone-100',
        className ?? '',
      ].join(' ')}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_30%)]" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/45 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-6 md:py-20 lg:px-8 lg:py-28">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-stretch xl:gap-12">
          <FadeIn className="flex h-full">
            <div className="group relative flex w-full flex-col justify-between overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,16,0.96),rgba(36,31,25,0.92))] p-7 shadow-[0_18px_44px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_64px_rgba(0,0,0,0.38)] sm:p-9 lg:p-10">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(245,158,11,0.10),transparent_28%,transparent_72%,rgba(255,255,255,0.06))]" />

              <div className="relative space-y-6">
                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                    About Us
                  </p>
                  <h2 className="max-w-3xl font-['Cormorant_Garamond',serif] text-[2.5rem] font-semibold leading-[0.92] text-white sm:text-[3.5rem] lg:text-[4.6rem]">
                    {headline}
                  </h2>
                </div>

                <div className="grid gap-4">
                  {bodyParagraphs.map((paragraph, index) => (
                    <div
                      key={`${paragraph}-${index}`}
                      className={[
                        'rounded-[28px] border border-white/8 bg-white/6 p-5 backdrop-blur-sm transition duration-300',
                        'hover:-translate-y-1 hover:bg-white/8 hover:shadow-[0_28px_64px_rgba(0,0,0,0.24)]',
                        index === 1 ? 'lg:ml-8' : '',
                        index === 2 ? 'lg:mr-10' : '',
                      ].join(' ')}
                    >
                      <p className="font-['Raleway',sans-serif] text-[1.02rem] leading-8 text-stone-200/92 sm:text-[1.08rem]">
                        {paragraph}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative mt-8 grid gap-3 pt-2 sm:grid-cols-3">
                {pillars.map((pillar, index) => (
                  <div
                    key={`${pillar}-${index}`}
                    className="rounded-[28px] border border-white/10 bg-black/20 px-4 py-4 text-center font-['Raleway',sans-serif] text-sm uppercase tracking-[0.12em] text-stone-200 transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_28px_64px_rgba(0,0,0,0.24)]"
                  >
                    {pillar}
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          <SlideInFromSide from="right" className="flex h-full">
            <div className="group relative flex w-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-stone-900 shadow-[0_18px_44px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_64px_rgba(0,0,0,0.38)]">
              <div className="relative min-h-[320px] flex-1 sm:min-h-[440px] lg:min-h-[100%]">
                {aboutImage ? (
                  <Image
                    src={aboutImage}
                    alt={`${companyName} renovation craftsmanship`}
                    fill
                    priority={false}
                    className="object-cover transition duration-700 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-stone-700 to-stone-950" />
                )}

                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.72))]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),linear-gradient(135deg,transparent_42%,rgba(245,158,11,0.16)_100%)]" />

                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                  <div className="rounded-[28px] border border-white/12 bg-white/10 p-5 backdrop-blur-md sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                      Crafted For Daily Living
                    </p>
                    <p className="mt-3 font-['Playfair_Display',serif] text-2xl leading-tight text-white sm:text-[2.2rem]">
                      Designed with warmth, built with discipline, and tailored to the way your household actually moves.
                    </p>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <Link
                        href="/visualizer"
                        className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 font-['Raleway',sans-serif] text-sm font-semibold uppercase tracking-[0.14em] text-primary-foreground transition duration-300 hover:scale-[1.02] hover:bg-primary/85"
                      >
                        Get Your Free Design Estimate
                      </Link>
                      <Link
                        href="/visualizer?mode=chat"
                        className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/8 px-6 py-3 font-['Raleway',sans-serif] text-sm font-semibold uppercase tracking-[0.14em] text-white transition duration-300 hover:scale-[1.02] hover:bg-white/14"
                      >
                        See Your Space Before You Build
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SlideInFromSide>
        </div>
      </div>
    </section>
  );
}
