/**
 * Custom Section Template — Full reference for Codex-generated sections.
 *
 * Every custom section MUST follow this pattern:
 * - 'use client' directive
 * - Import SectionBaseProps from @/lib/section-types
 * - Export a named function component
 * - Accept { branding, config, tokens, className } props
 * - Use str() helper for safe field access with camelCase/snake_case dual-lookup
 * - Use Tailwind CSS v4 for styling
 * - Use oklch() for colours (reference CSS custom properties)
 * - Use gradient fallbacks for missing images (NEVER return null for missing images)
 * - Use motion components for animations
 */

'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import Image from 'next/image';
import Link from 'next/link';
import { StaggerContainer, StaggerItem, FadeInUp } from '@/components/motion';

// TEMPLATE: Replace CustomSectionName and implement your section
export function CustomSectionName({ branding, config, tokens, className }: SectionBaseProps) {
  // Helper to safely read string fields from config (Record<string, unknown>)
  function str(v: unknown): string { return typeof v === 'string' && v.trim() ? v.trim() : ''; }

  // Dual-lookup: provisioner stores camelCase, but guard against snake_case too
  const heroHeadline    = str(config['heroHeadline'])    || str(config['hero_headline']);
  const heroSubheadline = str(config['heroSubheadline']) || str(config['hero_subheadline']);
  const heroImageUrl    = str(config['heroImageUrl'])    || str(config['hero_image_url']);
  const aboutCopy       = str(config['aboutCopy'])       || str(config['about_copy']) || str(config['about_text']);
  const aboutImageUrl   = str(config['aboutImageUrl'])   || str(config['about_image_url']);

  // Array fields — always default to empty array
  const services     = Array.isArray(config['services'])     ? config['services']     : [];
  const testimonials = Array.isArray(config['testimonials']) ? config['testimonials'] : [];

  // Only return null if there is genuinely zero data to render
  // NEVER return null just because an image is missing — use gradient fallback

  return (
    <section className={`py-12 md:py-20 ${className ?? ''}`}>
      {/* Hero area with graceful image fallback */}
      <div className="relative h-[50vh] min-h-[400px] w-full overflow-hidden">
        {heroImageUrl ? (
          <Image
            src={heroImageUrl}
            alt={branding.name}
            fill
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/70" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="relative z-10 mx-auto flex h-full max-w-6xl items-end px-4 pb-16">
          <StaggerContainer>
            <FadeInUp>
              <h1 className="font-heading text-4xl font-bold text-white md:text-5xl lg:text-6xl">
                {heroHeadline || branding.name}
              </h1>
            </FadeInUp>
            {heroSubheadline && (
              <FadeInUp>
                <p className="mt-4 max-w-2xl text-lg text-white/90 md:text-xl">
                  {heroSubheadline}
                </p>
              </FadeInUp>
            )}
            <FadeInUp>
              <Link
                href="/visualizer"
                className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:shadow-lg active:scale-95 transition-all duration-200"
              >
                Get Your Free Design Estimate
              </Link>
            </FadeInUp>
          </StaggerContainer>
        </div>
      </div>

      {/* Content area — services cards with stagger animation */}
      {services.length > 0 && (
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Our Services
          </h2>
          <StaggerContainer className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((svc: Record<string, unknown>, i: number) => {
              const imageUrls = Array.isArray(svc['image_urls']) ? svc['image_urls'] : [];
              const svcImage = str(imageUrls[0] as unknown);

              return (
                <StaggerItem key={i}>
                  <div className="group overflow-hidden rounded-xl border border-border bg-card hover:scale-[1.02] transition-transform duration-300">
                    <div className="relative aspect-video overflow-hidden">
                      {svcImage ? (
                        <Image
                          src={svcImage}
                          alt={str(svc['name'])}
                          fill
                          className="object-cover group-hover:brightness-110 transition-all duration-300"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/70" />
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="font-heading text-lg font-semibold text-foreground">
                        {str(svc['name'])}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {str(svc['description'])}
                      </p>
                    </div>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>
      )}

      {/* CTA block */}
      <FadeInUp>
        <div className="bg-primary px-4 py-16 text-center">
          <h2 className="font-heading text-3xl font-bold text-primary-foreground md:text-4xl">
            Ready to Transform Your Space?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
            {aboutCopy ? aboutCopy.slice(0, 150) + '...' : `${branding.name} is ready to bring your vision to life.`}
          </p>
          <Link
            href="/visualizer"
            className="mt-8 inline-block rounded-lg bg-white px-8 py-3 font-semibold text-primary hover:shadow-lg active:scale-95 transition-all duration-200 focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Start Your Project
          </Link>
        </div>
      </FadeInUp>
    </section>
  );
}
