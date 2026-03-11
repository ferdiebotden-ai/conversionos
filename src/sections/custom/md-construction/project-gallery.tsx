'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import Image from 'next/image';
import Link from 'next/link';
import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn } from '@/components/motion';

export function ProjectGallery({ branding, config: rawConfig, tokens, className }: SectionBaseProps) {
  void tokens;
  const config = rawConfig as unknown as Record<string, unknown>;

  function str(v: unknown): string {
    return typeof v === 'string' && v.trim() ? v.trim() : '';
  }

  function records(v: unknown): Record<string, unknown>[] {
    return Array.isArray(v)
      ? v.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      : [];
  }

  function itemImage(item: Record<string, unknown>): string {
    const imageUrls = Array.isArray(item['image_urls']) ? item['image_urls'] : [];
    return (
      str(item['imageUrl']) ||
      str(item['image_url']) ||
      str(item['image']) ||
      str(item['photoUrl']) ||
      str(item['photo_url']) ||
      str(imageUrls[0])
    );
  }

  const portfolio = records(config['portfolio']);
  const services = records(config['services']);
  const heroImageUrl = str(config['heroImageUrl']) || str(config['hero_image_url']);
  const aboutImageUrl = str(config['aboutImageUrl']) || str(config['about_image_url']);
  const serviceArea = str(config['serviceArea']) || str(config['service_area']) || branding.address || 'the region';

  const fallbackGallery = [
    { title: 'Custom Build', description: `A polished project completed for clients across ${serviceArea}.`, imageUrl: heroImageUrl },
    { title: 'Interior Upgrade', description: 'Thoughtful finishes, coordinated trades, and a clean handoff.', imageUrl: aboutImageUrl },
    { title: 'Structural Work', description: 'Solid preparation and precise execution from the ground up.', imageUrl: '' },
    { title: 'Outdoor Project', description: 'Durable details made for everyday use and long-term value.', imageUrl: '' },
  ];

  const gallery = portfolio.length
    ? portfolio.slice(0, 4).map((item, index) => ({
        title: str(item['title']) || str(item['name']) || `Featured Project ${index + 1}`,
        description:
          str(item['description']) || str(item['summary']) || 'A recent project delivered with attention to layout, finish quality, and durability.',
        imageUrl: itemImage(item),
      }))
    : services.slice(0, 4).map((item, index) => ({
        title: str(item['name']) || `Featured Project ${index + 1}`,
        description:
          str(item['description']) || 'A focused build that reflects durable materials, coordinated trades, and practical site planning.',
        imageUrl: itemImage(item),
      }));

  const galleryItems = gallery.length ? gallery : fallbackGallery;

  const layoutClasses = [
    'md:col-span-7 md:row-span-2',
    'md:col-span-5',
    'md:col-span-5',
    'md:col-span-7',
  ];

  return (
    <section className={`bg-background py-14 md:py-20 ${className ?? ''}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInUp>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="font-body text-sm uppercase tracking-[0.28em] text-primary">Project Gallery</p>
              <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground md:text-5xl">
                Recent work shaped for everyday living
              </h2>
            </div>
            <FadeIn>
              <p className="max-w-xl font-body text-base leading-7 text-muted-foreground">
                Browse a selection of spaces from {branding.name} that show the balance of planning, craftsmanship, and clean final detailing.
              </p>
            </FadeIn>
          </div>
        </FadeInUp>

        <StaggerContainer className="mt-10 grid gap-4 md:grid-cols-12 md:auto-rows-[220px]">
          {galleryItems.map((item, index) => (
            <StaggerItem key={`${item.title}-${index}`}>
              <div className={layoutClasses[index] ?? 'md:col-span-6'}>
                <ScaleIn>
                  <article className="group relative h-full min-h-[260px] overflow-hidden rounded-[28px]">
                    <div className="absolute inset-0">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/60 to-slate-900/85" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                    </div>
                    <div className="relative flex h-full flex-col justify-end p-6">
                      <p className="font-body text-xs uppercase tracking-[0.24em] text-white/70">
                        Project {String(index + 1).padStart(2, '0')}
                      </p>
                      <h3 className="mt-3 font-heading text-2xl font-semibold text-white">{item.title}</h3>
                      <p className="mt-2 max-w-md font-body text-sm leading-7 text-white/78">{item.description}</p>
                    </div>
                  </article>
                </ScaleIn>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <FadeInUp>
          <div className="mt-8 flex flex-col gap-4 rounded-[28px] border border-border bg-muted/40 p-6 md:flex-row md:items-center md:justify-between">
            <p className="font-body text-base text-muted-foreground">
              Want to see how your own space could come together before the build starts?
            </p>
            <Link
              href="/visualizer"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:scale-[1.02]"
            >
              Get Your Free Design Estimate
            </Link>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
