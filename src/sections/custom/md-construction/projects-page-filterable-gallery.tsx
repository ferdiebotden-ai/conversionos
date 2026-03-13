'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import type { SectionBaseProps } from '@/lib/section-types';

type ProjectCategory = 'All' | 'Home Renovations' | 'Additions' | 'Exterior';

type ProjectItem = {
  title: string;
  category: Exclude<ProjectCategory, 'All'>;
  image: string;
  alt: string;
};

const filters: ProjectCategory[] = ['All', 'Home Renovations', 'Additions', 'Exterior'];

const createPoster = (title: string, tone: string) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${tone}" />
          <stop offset="100%" stop-color="#272326" />
        </linearGradient>
      </defs>
      <rect width="1200" height="900" fill="url(#g)" />
      <rect x="72" y="72" width="1056" height="756" rx="20" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" />
      <text x="600" y="430" fill="#ffffff" font-family="Poppins, Arial, sans-serif" font-size="58" font-weight="600" text-anchor="middle">${title}</text>
      <text x="600" y="500" fill="rgba(255,255,255,0.8)" font-family="Inter, Arial, sans-serif" font-size="24" text-anchor="middle">MD Construction Portfolio</text>
    </svg>`,
  )}`;

const projects: ProjectItem[] = [
  {
    title: 'Custom Home Renovation',
    category: 'Home Renovations',
    image: createPoster('Home Renovation', '#8a5a61'),
    alt: 'Bright open-concept home renovation with modern finishes',
  },
  {
    title: 'Seamless Rear Addition',
    category: 'Additions',
    image: createPoster('Home Addition', '#72383f'),
    alt: 'Beautiful home addition blending into the existing exterior',
  },
  {
    title: 'Exterior Transformation',
    category: 'Exterior',
    image: createPoster('Exterior Upgrade', '#5f2f35'),
    alt: 'Updated exterior renovation with clean lines and premium materials',
  },
];

export function ProjectsPageFilterableGallery({ branding, config, tokens, className }: SectionBaseProps) {
  const [activeFilter, setActiveFilter] = useState<ProjectCategory>('All');
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  const filteredProjects = useMemo(() => {
    if (activeFilter === 'All') return projects;
    return projects.filter((project) => project.category === activeFilter);
  }, [activeFilter]);

  if (!branding || !config || !tokens) return null;

  return (
    <section className={`bg-white py-[100px] ${className ?? ''}`}>
      <div className="mx-auto w-full max-w-[1400px] px-6 md:px-12 xl:px-[90px]">
        <header className="mx-auto max-w-3xl text-center">
          <h2
            className="text-[2.25rem] font-semibold leading-tight tracking-[-0.02em] text-[oklch(0.24_0.02_10)] md:text-[3rem]"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Explore Recent Projects
          </h2>
          <p
            className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Browse renovation work across interiors, additions, and exterior upgrades built with craftsmanship,
            detail, and lasting value.
          </p>
        </header>

        <nav aria-label="Project categories" className="mt-10 flex justify-center">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {filters.map((filter) => {
              const isActive = activeFilter === filter;

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={[
                    'rounded-full border-2 px-5 py-3 text-[13px] font-semibold uppercase tracking-[1.5px] transition-all duration-300',
                    'focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none',
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-transparent bg-transparent text-[oklch(0.24_0.02_10)] hover:border-primary hover:text-primary',
                  ].join(' ')}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                  aria-pressed={isActive}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="mt-12 columns-1 gap-6 md:columns-2 xl:columns-3">
          {filteredProjects.map((project, index) => (
            <article
              key={project.title}
              className={[
                'group mb-6 break-inside-avoid overflow-hidden rounded-[4px] shadow-[6px_6px_9px_rgba(0,0,0,0.2)]',
                'transform transition-all duration-700 ease-out',
                isReady ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
              ].join(' ')}
              style={{ transitionDelay: `${index * 120}ms` }}
            >
              <button
                type="button"
                onClick={() => setSelectedProject(project)}
                className="block w-full text-left focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none"
                aria-label={`Open ${project.title} image`}
              >
                <div className="relative aspect-[4/3] w-full bg-muted">
                  <Image
                    src={project.image}
                    alt={project.alt}
                    fill
                    sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="absolute inset-0 flex items-end bg-black/10 p-6 opacity-0 transition-all duration-300 group-hover:bg-black/55 group-hover:opacity-100">
                  <footer>
                    <h4
                      className="text-2xl font-semibold text-white"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                      {project.title}
                    </h4>
                    <span
                      className="mt-2 inline-flex text-sm font-medium text-white/90 underline decoration-white/60 underline-offset-4"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      View
                    </span>
                  </footer>
                </div>
              </button>
            </article>
          ))}
        </div>

        <footer className="mt-12 flex justify-center">
          <Link
            href="/visualizer"
            className="inline-flex items-center rounded-[4px] bg-primary px-6 py-4 text-sm font-semibold uppercase tracking-[1.5px] text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5 focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Get Your Free Design Estimate
          </Link>
        </footer>

        {selectedProject ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6">
            <div className="w-full max-w-5xl rounded-[4px] bg-white p-4 shadow-2xl md:p-6">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h4 className="text-xl font-semibold text-[oklch(0.24_0.02_10)]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {selectedProject.title}
                </h4>
                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  className="rounded-full border border-primary px-3 py-1 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Close
                </button>
              </div>
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[4px]">
                <Image src={selectedProject.image} alt={selectedProject.alt} fill sizes="100vw" className="object-cover" />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
