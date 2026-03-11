'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import type { SectionBaseProps } from '@/lib/section-types';

const portfolioImages = [
  {
    src: '/images/portfolio/md-construction-project-1.jpg',
    alt: 'Custom renovation project showcase for MD Construction',
  },
  {
    src: '/images/portfolio/md-construction-project-2.jpg',
    alt: 'Finished interior remodel project by MD Construction',
  },
  {
    src: '/images/portfolio/md-construction-project-3.jpg',
    alt: 'Premium home renovation craftsmanship by MD Construction',
  },
] as const;

export function PortfolioShowcaseStrip({ branding, config, tokens, className }: SectionBaseProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setIsVisible(true);
        observer.disconnect();
      },
      { threshold: 0.2 }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  if (!branding || !config || !tokens || portfolioImages.length !== 3) return null;

  return (
    <section
      ref={sectionRef}
      className={`w-full bg-[#272326] py-[100px] ${className ?? ''}`}
      aria-labelledby="portfolio-showcase-heading"
    >
      <div className="mx-auto w-full max-w-[1400px] px-6 md:px-[90px]">
        <div
          className={`transform transition-all duration-700 ease-out ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <header className="max-w-3xl text-left">
            <div className="mb-6 h-px w-16 bg-[oklch(0.72_0.15_85)]" aria-hidden="true" />
            <h2
              id="portfolio-showcase-heading"
              className="font-[Poppins] text-4xl font-semibold leading-tight text-white md:text-[48px]"
            >
              Recent Projects
            </h2>
            <p className="mt-4 max-w-2xl font-[Inter] text-base leading-7 text-white/70 md:text-lg">
              Explore a focused selection of renovation work that reflects the craftsmanship,
              detail, and finish quality {branding.name ?? 'MD Construction'} brings to every
              build.
            </p>
          </header>

          <div className="mt-[60px] grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {portfolioImages.map((image, index) => (
              <article key={image.src}>
                <Link
                  href="/projects"
                  className="group block overflow-hidden rounded-[4px] focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label={`View project ${index + 1}`}
                >
                  <div className="relative aspect-video overflow-hidden rounded-[4px]">
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
                      className="object-cover transition-all duration-500 ease-out group-hover:scale-[1.03] group-hover:shadow-[12px_12px_50px_rgba(0,0,0,0.4)]"
                    />
                    <div className="absolute inset-0 rounded-[4px] ring-1 ring-white/10 transition-shadow duration-500 group-hover:shadow-[12px_12px_50px_rgba(0,0,0,0.4)]" />
                  </div>
                </Link>
              </article>
            ))}
          </div>

          <footer className="mt-10 flex justify-start md:justify-end">
            <nav aria-label="Portfolio navigation">
              <Link
                href="/projects"
                className="inline-flex items-center justify-center rounded-[4px] border-2 border-white px-6 py-3 font-[Inter] text-base font-semibold text-white transition-colors duration-200 hover:bg-white hover:text-[#272326] focus:outline-none focus:ring-2 focus:ring-primary"
              >
                View All Projects
              </Link>
            </nav>
          </footer>
        </div>
      </div>
    </section>
  );
}
