/**
 * Custom Section Template — Reference for Codex-generated sections.
 *
 * Every custom section MUST follow this pattern:
 * - 'use client' directive
 * - Import SectionBaseProps from @/lib/section-types
 * - Export a named function component
 * - Accept { branding, config, tokens, className } props
 * - Use Tailwind CSS for styling
 * - Use oklch() for colours (reference CSS custom properties)
 * - Return null if required data is missing
 */

'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import type { SectionBaseProps } from '@/lib/section-types';

type IconComponent = () => ReactElement;

type ValueSource =
  | string
  | {
      title?: string;
      label?: string;
      description?: string;
      body?: string;
      copy?: string;
    };

type CompanyProfile = {
  values?: ValueSource[];
  differentiators?: ValueSource[];
  about_copy?:
    | string
    | {
        subtitle?: string;
        why_choose_us?: ValueSource[];
      };
};

const DEFAULT_TITLES = ['Quality Craftsmanship', 'Reliable Service', 'Local Expertise'];
const VALUE_ICONS: IconComponent[] = [CraftsmanshipIcon, ServiceIcon, LocalIcon];

function extractTitle(source: ValueSource, index: number) {
  if (typeof source === 'string') {
    const text = source.trim();
    return text.split(/\s+/).length > 4 ? DEFAULT_TITLES[index] ?? 'Why Choose Us' : text;
  }

  return (source.title ?? source.label ?? DEFAULT_TITLES[index] ?? '').trim();
}

function extractDescription(source?: ValueSource) {
  if (!source) return '';
  if (typeof source === 'string') {
    return source.split(/\s+/).length > 4 ? source.trim() : '';
  }

  return (source.description ?? source.body ?? source.copy ?? '').trim();
}

function fallbackDescription(title: string) {
  const normalized = title.toLowerCase();

  if (/(quality|craft|finish|detail|workmanship)/.test(normalized)) {
    return 'Durable materials, careful planning, and polished finishes shape every renovation from demo to final walkthrough.';
  }

  if (/(reliable|service|communication|trust|timeline|responsive)/.test(normalized)) {
    return 'Clear updates, dependable scheduling, and a respectful jobsite keep your project moving with confidence.';
  }

  if (/(local|community|experience|expertise|family|st\.?\s*thomas)/.test(normalized)) {
    return 'Local renovation experience helps us recommend practical solutions that fit the homes, weather, and expectations in your area.';
  }

  return 'Thoughtful workmanship, professional communication, and a hands-on approach help deliver a renovation experience that feels smooth from start to finish.';
}

function pickIcon(title: string, index: number): IconComponent {
  const normalized = title.toLowerCase();

  if (/(quality|craft|finish|detail|workmanship)/.test(normalized)) return CraftsmanshipIcon;
  if (/(reliable|service|communication|trust|timeline|responsive)/.test(normalized)) return ServiceIcon;
  if (/(local|community|experience|expertise|family|st\.?\s*thomas)/.test(normalized)) return LocalIcon;

  return VALUE_ICONS[index % VALUE_ICONS.length] ?? CraftsmanshipIcon;
}

function normalizeItems(profile?: CompanyProfile) {
  const aboutEntries =
    profile?.about_copy && typeof profile.about_copy === 'object' && Array.isArray(profile.about_copy.why_choose_us)
      ? profile.about_copy.why_choose_us
      : [];
  const configuredEntries = [...(profile?.values ?? []), ...(profile?.differentiators ?? [])];
  const sourceEntries = configuredEntries.length > 0 ? configuredEntries : aboutEntries;
  const seen = new Set<string>();

  return sourceEntries.reduce<Array<{ title: string; description: string }>>((items, entry, index) => {
    const title = extractTitle(entry, index);
    const key = title.toLowerCase();

    if (!title || seen.has(key)) return items;

    seen.add(key);
    items.push({
      title,
      description:
        extractDescription(entry) || extractDescription(aboutEntries[index]) || fallbackDescription(title),
    });

    return items;
  }, []);
}

export function AboutPageValuesWhyChooseUs({ branding, config, tokens, className }: SectionBaseProps) {
  void tokens;

  const profile = ((config as { company_profile?: CompanyProfile } | undefined)?.company_profile) ?? undefined;
  const items = normalizeItems(profile).slice(0, 3);

  if (!items.length) return null;

  const brandName = (branding as { name?: string } | undefined)?.name?.trim();
  const heading = brandName ? `Why Choose ${brandName}` : 'Why Choose Us';
  const seededSubtitle =
    profile?.about_copy && typeof profile.about_copy === 'object' ? profile.about_copy.subtitle?.trim() : '';
  const subtitle =
    seededSubtitle ||
    `${brandName ?? 'Our team'} combines trusted craftsmanship, dependable communication, and local renovation insight to make every project feel well-managed and built to last.`;

  return (
    <section
      aria-labelledby="about-page-values-heading"
      className={`py-[100px] ${className ?? ''}`}
      style={{ backgroundColor: 'oklch(from var(--accentLight) l c h)' }}
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 xl:px-[90px]">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto h-[3px] w-16 rounded-full bg-[oklch(78%_0.12_84)]" />
          <h2
            id="about-page-values-heading"
            className="mt-6 font-[Poppins,sans-serif] text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
          >
            {heading}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-[Inter,sans-serif] text-base leading-7 text-muted-foreground md:text-lg">
            {subtitle}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
          {items.map((item, index) => {
            const Icon = pickIcon(item.title, index);

            return (
              <article
                key={`${item.title}-${index}`}
                className="flex h-full flex-col rounded-[4px] bg-white p-10 opacity-0 shadow-[6px_6px_9px_rgba(0,0,0,0.2)] transition-transform duration-300 hover:-translate-y-1 motion-reduce:opacity-100 motion-reduce:transition-none motion-reduce:[animation:none] [animation:value-card-reveal_680ms_cubic-bezier(0.22,1,0.36,1)_forwards]"
                style={{ animationDelay: `${index * 140}ms` }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Icon />
                </div>
                <h4 className="mt-6 font-[Poppins,sans-serif] text-xl font-semibold text-foreground">
                  {item.title}
                </h4>
                <p className="mt-4 font-[Inter,sans-serif] text-base leading-7 text-muted-foreground">
                  {item.description}
                </p>
              </article>
            );
          })}
        </div>

        <footer className="mt-10">
          <nav aria-label="About page call to action" className="flex justify-center">
            <Link
              href="/visualizer"
              className="inline-flex items-center justify-center rounded-[4px] bg-primary px-6 py-3 font-[Inter,sans-serif] text-base font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Get Your Free Design Estimate
            </Link>
          </nav>
        </footer>
      </div>

      <style jsx>{`
        @keyframes value-card-reveal {
          from {
            opacity: 0;
            transform: translateY(24px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}

function CraftsmanshipIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4.5 19.5L15 9m-3-4.5l4.5 4.5m-6 8.25l-2.25 2.25a1.5 1.5 0 01-2.12 0l-1.38-1.38a1.5 1.5 0 010-2.12L7 13.5" />
      <path d="M13.5 4.5l6 6" />
    </svg>
  );
}

function ServiceIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4.5 7.5h15v9h-15z" />
      <path d="M8 12l2.5 2.5L16 9" />
    </svg>
  );
}

function LocalIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s6-5.5 6-11a6 6 0 10-12 0c0 5.5 6 11 6 11z" />
      <circle cx="12" cy="10" r="2.25" />
    </svg>
  );
}
