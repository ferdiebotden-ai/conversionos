'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import Image from 'next/image';
import Link from 'next/link';
import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn } from '@/components/motion';

export function ProjectGallery({ branding, config, tokens, className }: SectionBaseProps) {
  function str(v: unknown): string {
    return typeof v === 'string' && v.trim() ? v.trim() : '';
  }

  function rec(v: unknown): Record<string, unknown> {
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  }

  const serviceArea = str(config['serviceArea']) || str(config['service_area']);
  const portfolioRaw = Array.isArray(config['portfolio']) ? config['portfolio'] : [];
  const servicesRaw = Array.isArray(config['services']) ? config['services'] : [];
  const galleryItems = portfolioRaw.length
    ? portfolioRaw.map((item) => rec(item))
    : servicesRaw.slice(0, 4).map((item) => rec(item));
  const items = galleryItems.length
    ? galleryItems
    : [
        { title: 'Residential Renovation', description: 'A refined space planned around materials, flow, and finish quality.' },
        { title: 'Interior Refresh', description: 'Updated layouts and durable finishes built for daily use.' },
        { title: 'Custom Build Detail', description: 'Craft-focused work that balances visual impact and long-term performance.' },
        { title: 'Project Completion', description: 'Polished final spaces with practical sequencing and cleaner decision-making.' },
      ];
  const tokenCount =
    tokens && typeof tokens === 'object' ? Object.keys(tokens as Record<string, unknown>).length : 0;

  return (
    <section
      id="gallery"
      data-token-count={tokenCount}
      className={`bg-muted py-16 text-foreground md:py-24 ${className ?? ''}`}
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn>
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Project Gallery</p>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight md:text-5xl">
                Recent work presented with the same clarity as the build itself.
              </h2>
            </div>
            <p className="max-w-xl font-body text-base leading-7 text-muted-foreground">
              {serviceArea
                ? `Projects across ${serviceArea} are documented to show finish quality, material decisions, and the type of environments ${branding.name} helps bring together.`
                : `${branding.name} highlights completed work with a balance of atmosphere, detail, and practical execution.`}
            </p>
          </div>
        </FadeIn>

        <StaggerContainer>
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-12">
            {items.map((item, index) => {
              const imageUrls = Array.isArray(item['image_urls']) ? item['image_urls'] : [];
              const imageUrl = str(item['imageUrl']) || str(item['image_url']) || str(imageUrls[0]);
              const title = str(item['title']) || str(item['name']) || `Project ${index + 1}`;
              const description =
                str(item['description']) ||
                'A focused scope delivered with strong sequencing, refined finishes, and consistent execution on site.';
              const spanClass =
                index === 0
                  ? 'xl:col-span-7'
                  : index === 1
                    ? 'xl:col-span-5'
                    : 'xl:col-span-6';

              return (
                <StaggerItem key={`${title}-${index}`}>
                  <ScaleIn>
                    <article className={`group overflow-hidden rounded-[30px] border border-border bg-background ${spanClass}`}>
                      <div className="relative aspect-[4/3] overflow-hidden md:aspect-[16/11]">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 1280px) 100vw, 50vw"
                          />
                        ) : (
                          <div
                            className="absolute inset-0"
                            style={{
                              backgroundImage:
                                'linear-gradient(145deg, oklch(var(--primary) / 0.92), oklch(var(--muted) / 0.92))',
                            }}
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                        <div className="absolute left-5 top-5 rounded-full bg-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
                          {String(index + 1).padStart(2, '0')}
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="font-heading text-2xl font-semibold">{title}</h3>
                        <p className="mt-3 max-w-2xl font-body text-sm leading-7 text-muted-foreground">
                          {description}
                        </p>
                      </div>
                    </article>
                  </ScaleIn>
                </StaggerItem>
              );
            })}
          </div>
        </StaggerContainer>

        <FadeInUp>
          <div className="mt-12 text-center">
            <Link
              href="/visualizer"
              className="inline-flex rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:scale-[1.01]"
            >
              Get Your Free Design Estimate
            </Link>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
