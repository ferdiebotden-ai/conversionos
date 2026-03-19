'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Star } from 'lucide-react';

import { FadeIn, FadeInUp, StaggerContainer, StaggerItem } from '@/components/motion';
import type { SectionBaseProps } from '@/lib/section-types';
import { asRecord, normalizePortfolio, normalizeTestimonials } from '@/sections/custom/_shared/content';

export function Testimonials({ branding, config, className }: SectionBaseProps) {
  const pathname = usePathname();
  const company = asRecord(config);
  const testimonials = normalizeTestimonials(company['testimonials']);
  const portfolio = normalizePortfolio(company['portfolio']);

  if (testimonials.length === 0) return null;

  const displayTestimonials = pathname === '/' ? testimonials.slice(0, 3) : testimonials;
  const sideImages = portfolio.slice(0, 2);

  return (
    <section className={['bg-[#22221e] py-16 text-white md:py-24', className ?? ''].join(' ')}>
      <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-6 lg:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)] lg:px-10">
        <FadeIn className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#c9c5b7]">Client Reviews</p>
            <h2
              className="text-[clamp(2.5rem,5vw,5rem)] font-semibold leading-[0.94] text-white"
              style={{ fontFamily: '"Playfair Display","Cormorant Garamond",serif' }}
            >
              Homeowners remember the process as much as the finish.
            </h2>
            <p className="max-w-xl text-[15px] leading-8 text-white/72 md:text-base">
              The strongest pattern in Go Hard Corporation’s reviews is the same one visible in the finished work: careful sequencing, strong communication, and craftsmanship that still feels sharp once the dust settles.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {sideImages.map((item) => (
                <div key={item.title} className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/5">
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width: 1024px) 50vw, 20vw"
                    className="object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.72))]" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-white/70">{item.category}</p>
                    <p className="mt-2 text-lg leading-tight text-white">{item.title}</p>
                  </div>
                </div>
              ))}
            </div>

            <FadeInUp>
              <Link
                href="/visualizer"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-7 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-primary-foreground transition duration-300 hover:scale-[1.02] hover:bg-primary/90"
              >
                Get Your Free Design Estimate
              </Link>
            </FadeInUp>
          </div>
        </FadeIn>

        <StaggerContainer className="grid gap-5">
          {displayTestimonials.map((testimonial) => (
            <StaggerItem key={`${testimonial.author}-${testimonial.quote.slice(0, 24)}`}>
              <article className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.18)] backdrop-blur-sm md:p-7">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1 text-[#f3d788]">
                    {Array.from({ length: testimonial.rating }).map((_, index) => (
                      <Star key={index} className="size-4 fill-current" />
                    ))}
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.28em] text-white/52">{testimonial.projectType}</span>
                </div>
                <p className="mt-5 text-[15px] leading-8 text-white/82 md:text-base">{testimonial.quote}</p>
                <div className="mt-6 border-t border-white/10 pt-4">
                  <p
                    className="text-[1.5rem] leading-tight text-white"
                    style={{ fontFamily: '"Playfair Display","Cormorant Garamond",serif' }}
                  >
                    {testimonial.author}
                  </p>
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
