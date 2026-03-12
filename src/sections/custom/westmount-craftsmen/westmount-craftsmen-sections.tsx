'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  StaggerContainer,
  StaggerItem,
  FadeInUp,
  FadeIn,
  ScaleIn,
  SlideInFromSide,
} from '@/components/motion';
import {
  SERVICES,
  TESTIMONIALS,
  PROJECTS,
  PUBLIC_CONTENT,
  TRUST_METRICS,
} from '@/lib/sites/westmount-craftsmen';

// ── Shared Design System ──────────────────────────────────────
// These tokens MUST be used consistently across ALL sections:

function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
      {children}
    </p>
  );
}

// Shared card class — same radius, shadow, hover on every card
const CARD =
  'rounded-[28px] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.06)] hover:-translate-y-1 hover:shadow-[0_24px_56px_rgba(15,23,42,0.10)] transition-all duration-300';

const CARD_DARK =
  'rounded-[28px] border border-white/15 bg-white/10 shadow-[0_18px_44px_rgba(15,23,42,0.06)] backdrop-blur hover:-translate-y-1 hover:shadow-[0_24px_56px_rgba(15,23,42,0.10)] transition-all duration-300';

const SHELL = 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8';
const SURFACE = 'border border-stone-200/80';
const SECTION_TITLE =
  'font-heading text-4xl font-black tracking-[-0.04em] text-stone-950 sm:text-5xl lg:text-6xl';
const BODY_COPY =
  'font-body text-base leading-7 text-stone-700 sm:text-[17px]';
const BUTTON_PRIMARY =
  'inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white transition-all duration-300 hover:scale-[1.02] hover:bg-primary/90';
const BUTTON_SECONDARY_DARK =
  'inline-flex items-center justify-center rounded-full border border-white/35 bg-white/10 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white backdrop-blur transition-all duration-300 hover:scale-[1.02] hover:border-white hover:bg-white/16';
const BUTTON_SECONDARY_LIGHT =
  'inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-900 transition-all duration-300 hover:scale-[1.02] hover:border-primary hover:text-primary';
const BADGE =
  'inline-flex items-center rounded-full border border-stone-200 bg-white/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-700';
const BADGE_DARK =
  'inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur';

type DataRecord = Record<string, unknown>;

type NormalizedService = {
  name: string;
  description: string;
  features: string[];
  image: string;
};

type NormalizedProject = {
  title: string;
  category: string;
  location: string;
  image: string;
};

type NormalizedStep = {
  title: string;
  description: string;
};

type NormalizedTestimonial = {
  author: string;
  text: string;
  rating: number;
  role: string;
};

type NormalizedLink = {
  label: string;
  href: string;
};

type TrustHighlight = {
  value: string;
  label: string;
};

const FALLBACK_HISTORY =
  'Westmount Craftsmen is a family-owned and fully insured general contractor serving the Kitchener Waterloo area. The team invests heavily in the front-end design phase so each renovation solves real problems, supports daily routines, and brings the finished space to life with craftsmanship that feels considered from the first sketch through the last detail.';

const FALLBACK_SERVICES: NormalizedService[] = [
  {
    name: 'Kitchen Renovation',
    description:
      'Kitchen renovations designed to improve space, function, and the everyday experience of the heart of your home.',
    features: [
      'Front-end kitchen design planning',
      'Layouts designed to feel more spacious',
      'Kitchen additions when extra space is needed',
      'Designs tailored to household routines',
    ],
    image: '',
  },
  {
    name: 'Bathroom Renovation',
    description:
      'Bathroom renovations focused on beauty, layout, watertight construction, and easy long-term maintenance.',
    features: [
      'Layout planning that balances beauty and utility',
      '100% watertight construction practices',
      'Easy-to-maintain finishes and details',
      'Build quality intended to last',
    ],
    image: '',
  },
  {
    name: 'Basement Renovation',
    description:
      'Basement renovations that turn underused square footage into bright living areas, game rooms, or legal rental units.',
    features: [
      'Bright and spacious lower-level transformations',
      'Family recreation and entertaining zones',
      'Legal rental unit focused layouts',
      'Plans aimed at increasing property value',
    ],
    image: '',
  },
  {
    name: 'Home Renovation',
    description:
      'Home renovations that rework layout and flow to better match your tastes, routine, and the way your household lives.',
    features: [
      'Whole-home evaluation of what works and what does not',
      'Redesigned layouts that improve flow',
      'Renovations aligned with daily routines',
      'Tailored design approach based on lifestyle',
    ],
    image: '',
  },
];

const BASE = 'https://ktpfyangnmpwufghgasx.supabase.co/storage/v1/object/public/tenant-assets/westmount-craftsmen';
const FALLBACK_PROJECTS: NormalizedProject[] = [
  {
    title: 'Open-Concept Family Kitchen',
    category: 'Kitchen Renovation',
    location: 'Waterloo',
    image: `${BASE}/services/kitchen-renovation.webp`,
  },
  {
    title: 'Spa-Inspired Ensuite Retreat',
    category: 'Bathroom Renovation',
    location: 'Kitchener',
    image: `${BASE}/services/bathroom-renovation.webp`,
  },
  {
    title: 'Bright Lower-Level Living',
    category: 'Basement Renovation',
    location: 'Cambridge',
    image: `${BASE}/services/basement-renovation.webp`,
  },
  {
    title: 'Main Floor Reimagined',
    category: 'Home Renovation',
    location: 'New Hamburg',
    image: `${BASE}/services/home-renovation.webp`,
  },
  {
    title: 'Custom Joinery Kitchen Detail',
    category: 'Kitchen Renovation',
    location: 'St Jacobs',
    image: `${BASE}/services/kitchen-renovation.webp`,
  },
  {
    title: 'Family Home Layout Refresh',
    category: 'Home Renovation',
    location: 'Guelph',
    image: `${BASE}/services/home-renovation.webp`,
  },
];

const FALLBACK_PROCESS: NormalizedStep[] = [
  {
    title: 'Front-End Design Phase',
    description:
      'Westmount Craftsmen spends substantial time with homeowners at the front end of the design phase before construction begins.',
  },
  {
    title: 'Design Around Your Needs',
    description:
      'Every design choice is shaped around the homeowner’s practical needs, pain points, and aesthetic goals.',
  },
  {
    title: 'Deliver the Finish Well',
    description:
      'The team stays focused on a finished product that exceeds expectations and feels worth the investment.',
  },
];

const FALLBACK_SERVICE_AREAS = [
  'Kitchener',
  'Waterloo',
  'Cambridge',
  'New Hamburg',
  'St Jacobs',
  'Guelph',
];

const GALLERY_SPANS = [
  'xl:col-span-6 xl:row-span-2',
  'xl:col-span-3 xl:row-span-1',
  'xl:col-span-3 xl:row-span-1',
  'xl:col-span-4 xl:row-span-1',
  'xl:col-span-4 xl:row-span-1',
  'xl:col-span-4 xl:row-span-1',
] as const;

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function asText(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${value}`;
  }
  return '';
}

function asRecord(value: unknown): DataRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as DataRecord)
    : {};
}

function asRecordArray(value: unknown): DataRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => asRecord(entry))
    .filter((entry) => Object.keys(entry).length > 0);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => asText(entry)).filter(Boolean);
}

function pickText(source: unknown, keys: string[]): string {
  const record = asRecord(source);

  for (const key of keys) {
    const candidate = asText(record[key]);
    if (candidate) {
      return candidate;
    }
  }

  return '';
}

function pickList(source: unknown, keys: string[]): unknown[] {
  const record = asRecord(source);

  for (const key of keys) {
    const candidate = record[key];
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function pickImage(source: unknown, keys: string[]): string {
  const direct = pickText(source, keys);
  if (direct) {
    return direct;
  }

  const nestedLists = pickList(source, ['images', 'gallery', 'photos', 'media']);
  for (const entry of nestedLists) {
    if (typeof entry === 'string' && entry.trim()) {
      return entry.trim();
    }

    const record = asRecord(entry);
    const candidate = pickText(record, [
      'url',
      'src',
      'image',
      'imageUrl',
      'image_url',
      'photo',
      'photoUrl',
      'photo_url',
    ]);

    if (candidate) {
      return candidate;
    }
  }

  return '';
}

function cleanPhone(value: string) {
  return value.replace(/[^\d+]/g, '');
}

function firstWords(value: string, count: number) {
  const words = value.split(/\s+/).filter(Boolean);
  return words.slice(0, count).join(' ');
}

function isExternal(href: string) {
  return /^https?:\/\//.test(href);
}

function normalizeServices(): NormalizedService[] {
  const services = asRecordArray(SERVICES);
  if (!services.length) {
    return FALLBACK_SERVICES;
  }

  return services.slice(0, 4).map((service, index) => {
    const fallback = FALLBACK_SERVICES[index] ?? FALLBACK_SERVICES[0]!;
    const features = pickList(service, ['features', 'bullets', 'highlights'])
      .map((entry) => {
        if (typeof entry === 'string') {
          return entry.trim();
        }
        return pickText(entry, ['label', 'text', 'title', 'name']);
      })
      .filter(Boolean)
      .slice(0, 4);

    return {
      name:
        pickText(service, ['name', 'title', 'serviceName', 'service_name']) ||
        fallback.name,
      description:
        pickText(service, [
          'shortDescription',
          'short_description',
          'description',
          'summary',
          'excerpt',
        ]) || fallback.description,
      features: features.length ? features : fallback.features,
      image:
        pickImage(service, [
          'imageUrl',
          'image_url',
          'image',
          'photo',
          'photoUrl',
          'photo_url',
          'src',
        ]) ||
        normalizeProjects()[index]?.image ||
        '',
    };
  });
}

function normalizeProjects(): NormalizedProject[] {
  const projects = asRecordArray(PROJECTS);
  if (!projects.length) {
    return FALLBACK_PROJECTS;
  }

  return projects.slice(0, 6).map((project, index) => {
    const fallback = FALLBACK_PROJECTS[index] ?? FALLBACK_PROJECTS[0]!;
    return {
      title:
        pickText(project, ['title', 'name', 'projectName', 'project_name']) ||
        fallback.title,
      category:
        pickText(project, [
          'category',
          'service',
          'serviceName',
          'service_name',
          'type',
        ]) || fallback.category,
      location:
        pickText(project, ['location', 'city', 'area', 'serviceArea']) ||
        fallback.location,
      image:
        pickImage(project, [
          'imageUrl',
          'image_url',
          'image',
          'coverImageUrl',
          'cover_image_url',
          'cover',
          'photo',
          'photoUrl',
          'photo_url',
        ]) || fallback.image,
    };
  });
}

function normalizeProcessSteps(contentRecord: DataRecord): NormalizedStep[] {
  const steps = asRecordArray(
    contentRecord['processSteps'] ?? contentRecord['process_steps'],
  );
  if (!steps.length) {
    return FALLBACK_PROCESS;
  }

  return steps.slice(0, 3).map((step, index) => {
    const fallback = FALLBACK_PROCESS[index] ?? FALLBACK_PROCESS[0]!;
    return {
      title: pickText(step, ['title', 'name', 'heading']) || fallback.title,
      description:
        pickText(step, ['description', 'text', 'body', 'summary']) ||
        fallback.description,
    };
  });
}

function normalizeServiceAreas(contentRecord: DataRecord): string[] {
  const directAreas = asStringArray(
    contentRecord['serviceAreas'] ?? contentRecord['service_areas'],
  );
  return directAreas.length ? directAreas : FALLBACK_SERVICE_AREAS;
}

function normalizeTestimonial(): NormalizedTestimonial {
  const testimonials = asRecordArray(TESTIMONIALS);
  const testimonial = testimonials[0] ?? {};
  const author = pickText(testimonial, ['author', 'name']) || 'Sandy E.';
  const text =
    pickText(testimonial, ['text', 'quote', 'review', 'body']) ||
    'Westmount recently renovated our entire main floor including kitchen, bathroom, bedrooms, etc. From start to finish, the entire team were professional, pleasant and easy to communicate with. Our reno far exceeded our expectations and we could not be more thrilled with the results.';
  const ratingValue = Number(
    pickText(testimonial, ['rating', 'stars']) ||
      asText(asRecord(testimonial)['rating']),
  );

  return {
    author,
    text,
    rating: Number.isFinite(ratingValue) && ratingValue > 0 ? ratingValue : 5,
    role:
      pickText(testimonial, ['role', 'title', 'location']) ||
      'Main floor renovation client',
  };
}

function normalizeSocialLinks(contentRecord: DataRecord): NormalizedLink[] {
  const candidates: NormalizedLink[] = [
    {
      label: 'Instagram',
      href: pickText(contentRecord, ['instagramUrl', 'instagram_url']),
    },
    {
      label: 'Facebook',
      href: pickText(contentRecord, ['facebookUrl', 'facebook_url']),
    },
    {
      label: 'Houzz',
      href: pickText(contentRecord, ['houzzUrl', 'houzz_url']),
    },
  ].filter((item) => item.href);

  return candidates;
}

function normalizeTrustHighlights(
  trustRecord: DataRecord,
  serviceAreas: string[],
): TrustHighlight[] {
  const highlights: TrustHighlight[] = [];
  const years = pickText(trustRecord, ['yearsInBusiness', 'years_in_business']);
  const projectsCompleted = pickText(trustRecord, [
    'projectsCompleted',
    'projects_completed',
  ]);
  const rating = pickText(trustRecord, ['googleRating', 'google_rating']);
  const reviewCount = pickText(trustRecord, [
    'googleReviewCount',
    'google_review_count',
  ]);

  if (years) {
    highlights.push({ value: `${years}+`, label: 'Years refining homes' });
  }

  if (projectsCompleted) {
    highlights.push({ value: `${projectsCompleted}+`, label: 'Projects built' });
  }

  if (rating) {
    highlights.push({
      value: `${rating}/5`,
      label: reviewCount ? `${reviewCount} Google reviews` : 'Client rating',
    });
  }

  if (highlights.length < 4) {
    highlights.push({ value: 'Family', label: 'Owned and accountable' });
  }

  if (highlights.length < 4) {
    highlights.push({ value: 'Insured', label: 'Protected on every project' });
  }

  if (highlights.length < 4) {
    highlights.push({
      value: `${serviceAreas.length}`,
      label: 'Local communities served',
    });
  }

  return highlights.slice(0, 4);
}

function mediaAlt(brandingName: string, detail: string) {
  return `${brandingName} ${detail}`.trim();
}

function MediaFill({
  src,
  alt,
  priority,
  sizes,
  className,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  sizes: string;
  className?: string;
}) {
  return src ? (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority ?? false}
      sizes={sizes}
      className={cx('object-cover', className)}
    />
  ) : (
    <div
      className={cx(
        'absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(26,115,232,0.45),transparent_35%),linear-gradient(135deg,rgba(12,17,29,0.98)_0%,rgba(30,41,59,0.92)_42%,rgba(41,51,65,0.88)_100%)]',
        className,
      )}
    />
  );
}

function StarRow({ rating }: { rating: number }) {
  const count = Math.max(1, Math.min(5, Math.round(rating)));

  return (
    <div className="flex items-center gap-1 text-primary">
      {Array.from({ length: count }).map((_, index) => (
        <span key={index} aria-hidden="true" className="text-base">
          ★
        </span>
      ))}
    </div>
  );
}

function FeatureBullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm leading-6 text-stone-700">
      <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
        +
      </span>
      <span>{children}</span>
    </li>
  );
}

function ContactLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const sharedClass =
    'text-sm uppercase tracking-[0.2em] text-white/80 transition-colors duration-300 hover:text-white';

  if (isExternal(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={sharedClass}
      >
        {label}
      </a>
    );
  }

  return (
    <a href={href} className={sharedClass}>
      {label}
    </a>
  );
}

const contentRecord = asRecord(PUBLIC_CONTENT);
const trustRecord = asRecord(TRUST_METRICS);
const services = normalizeServices();
const projects = normalizeProjects();
const processSteps = normalizeProcessSteps(contentRecord);
const testimonial = normalizeTestimonial();
const serviceAreas = normalizeServiceAreas(contentRecord);
const socialLinks = normalizeSocialLinks(contentRecord);
const trustHighlights = normalizeTrustHighlights(trustRecord, serviceAreas);

const heroEyebrow =
  pickText(contentRecord, ['heroEyebrow', 'hero_eyebrow']) ||
  'FAMILY-OWNED & FULLY INSURED';
const heroHeadline =
  pickText(contentRecord, ['heroHeadline', 'hero_headline']) || 'Love Your Home';
const heroSubheadline =
  pickText(contentRecord, ['heroSubheadline', 'hero_subheadline']) ||
  'Renovations Made Easy';
const businessHistory =
  pickText(contentRecord, [
    'businessHistory',
    'business_history',
    'aboutCopy',
    'about_copy',
  ]) || FALLBACK_HISTORY;
const heroImage =
  pickText(contentRecord, ['heroImageUrl', 'hero_image_url']) ||
  projects[0]?.image ||
  services[0]?.image ||
  '';
const aboutImage =
  pickText(contentRecord, ['aboutImageUrl', 'about_image_url']) ||
  projects[1]?.image ||
  projects[0]?.image ||
  services[1]?.image ||
  '';

// ── Section Components ──────────────────────────────────────

export function HeroSection({
  branding,
  config,
  tokens,
  className,
}: SectionBaseProps) {
  void config;
  void tokens;

  const brand = asRecord(branding);
  const businessName = asText(brand["name"]) || 'Westmount Craftsmen';
  const phone = asText(brand["phone"]);
  const address = asText(brand["address"]);
  const logo =
    asText(brand["logo_url"]) || asText(brand["logoUrl"]) || asText(brand["logo"]);
  const monogram = firstWords(businessName, 2)
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <section
      id="hero"
      className={cx(
        'relative isolate overflow-hidden bg-stone-950 text-white',
        className,
      )}
    >
      <div className="absolute inset-0">
        <div className="absolute inset-0">
          <MediaFill
            src={heroImage}
            alt={mediaAlt(businessName, 'hero renovation project')}
            priority
            sizes="100vw"
          />
        </div>
        <div className="absolute inset-0 bg-stone-950/55" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,17,29,0.76)_0%,rgba(12,17,29,0.22)_36%,rgba(12,17,29,0.86)_100%)]" />
        <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:120px_120px]" />
        <div className="absolute inset-y-0 right-0 w-full bg-[radial-gradient(circle_at_top_right,rgba(26,115,232,0.28),transparent_32%)]" />
      </div>

      <div className="relative flex min-h-[92vh] items-center py-24 sm:py-28 lg:py-32">
        <div className={SHELL}>
          <FadeInUp>
            <StaggerContainer>
              <div className="mx-auto max-w-5xl text-center">
                <StaggerItem>
                  <div className="mb-8 inline-flex items-center gap-4 rounded-full border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                    <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10 text-sm font-bold uppercase tracking-[0.28em] text-white">
                      {logo ? (
                        <Image
                          src={logo}
                          alt={businessName}
                          fill
                          sizes="44px"
                          className="object-contain p-2"
                        />
                      ) : (
                        <span>{monogram}</span>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
                        Westmount Craftsmen
                      </p>
                      <p className="font-heading text-sm tracking-[0.08em] text-white">
                        Kitchener Waterloo Renovations
                      </p>
                    </div>
                  </div>
                </StaggerItem>

                <StaggerItem>
                  <div className="mb-6 flex justify-center">
                    <SectionEyebrow>{heroEyebrow}</SectionEyebrow>
                  </div>
                </StaggerItem>

                <StaggerItem>
                  <h1 className="font-heading text-[3.4rem] font-black uppercase leading-[0.92] tracking-[-0.07em] text-white sm:text-[4.8rem] lg:text-[6.75rem]">
                    <span className="block">{heroHeadline}</span>
                    <span className="mt-3 block text-primary sm:mt-4">
                      {heroSubheadline}
                    </span>
                  </h1>
                </StaggerItem>

                <StaggerItem>
                  <p className="mx-auto mt-8 max-w-3xl font-body text-base leading-7 text-white/82 sm:text-lg sm:leading-8">
                    Design-first renovations for Kitchener Waterloo homeowners
                    who want a more functional, more beautiful home without
                    settling for generic solutions. Westmount Craftsmen plans the
                    hard decisions early so the finished space feels calm,
                    resolved, and built around the way you actually live.
                  </p>
                </StaggerItem>

                <StaggerItem>
                  <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                    <Link href="/visualizer" className={BUTTON_PRIMARY}>
                      OUR PROJECTS
                    </Link>
                    <Link
                      href="/visualizer?mode=chat"
                      className={BUTTON_SECONDARY_DARK}
                    >
                      REQUEST QUOTE
                    </Link>
                  </div>
                </StaggerItem>

                <StaggerItem>
                  <div className="mx-auto mt-10 max-w-3xl rounded-[28px] border border-white/15 bg-white/10 p-6 text-left backdrop-blur sm:p-7">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                      <div className="max-w-2xl">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                          Preview First, Then Build
                        </p>
                        <p className="mt-3 font-heading text-2xl font-bold leading-tight text-white sm:text-3xl">
                          See tailored renovation directions before the first
                          wall opens up.
                        </p>
                        <p className="mt-3 text-sm leading-7 text-white/75 sm:text-base">
                          Bring a photo of your home into the design studio,
                          compare ideas quickly, and start the conversation with
                          more clarity than a standard contact form ever gives
                          you.
                        </p>
                      </div>
                      <Link href="/visualizer" className={BUTTON_SECONDARY_DARK}>
                        See Your Space Before You Build
                      </Link>
                    </div>
                  </div>
                </StaggerItem>
              </div>
            </StaggerContainer>
          </FadeInUp>

          <StaggerContainer>
            <div className="mt-14 grid gap-4 md:grid-cols-3">
              <StaggerItem>
                <div className={cx(CARD_DARK, 'p-6')}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                    Service Area
                  </p>
                  <p className="mt-3 font-heading text-2xl font-bold text-white">
                    {serviceAreas.slice(0, 3).join(' • ')}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/72">
                    Renovation planning and construction across the wider
                    Kitchener Waterloo region.
                  </p>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div className={cx(CARD_DARK, 'p-6')}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                    Peace Of Mind
                  </p>
                  <p className="mt-3 font-heading text-2xl font-bold text-white">
                    Family-Owned. Fully Insured.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/72">
                    A hands-on team with a design process that respects the
                    complexity of renovating a lived-in home.
                  </p>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div className={cx(CARD_DARK, 'p-6')}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                    Contact
                  </p>
                  <p className="mt-3 font-heading text-2xl font-bold text-white">
                    {phone || 'Book a design conversation'}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/72">
                    {address ||
                      'Bring your photos, priorities, and problem spots. Westmount Craftsmen will help shape the right path forward.'}
                  </p>
                </div>
              </StaggerItem>
            </div>
          </StaggerContainer>
        </div>
      </div>
    </section>
  );
}

export function ServicesSection({
  branding,
  config,
  tokens,
  className,
}: SectionBaseProps) {
  void config;
  void tokens;

  const businessName = asText(asRecord(branding)["name"]) || 'Westmount Craftsmen';

  return (
    <section
      id="services"
      className={cx('relative overflow-hidden bg-white py-20 sm:py-24 lg:py-28', className)}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(26,115,232,0.08),transparent_24%),linear-gradient(180deg,#ffffff_0%,#fbfaf6_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-stone-200" />

      <div className={cx(SHELL, 'relative')}>
        <FadeInUp>
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <SectionEyebrow>Built Around Daily Living</SectionEyebrow>
              <h2 className={cx(SECTION_TITLE, 'mt-5 max-w-3xl')}>
                Renovation services designed from the inside out.
              </h2>
            </div>

            <div className={cx(CARD, SURFACE, 'p-6 sm:p-7')}>
              <p className={BODY_COPY}>
                Every room Westmount Craftsmen takes on begins with the same
                question: what is not working in the way this home is being used
                today? That design-first mindset keeps the work practical,
                polished, and personal instead of formulaic.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <span className={BADGE}>Thoughtful planning</span>
                <span className={BADGE}>High-use durability</span>
                <span className={BADGE}>Craft-led detailing</span>
              </div>
            </div>
          </div>
        </FadeInUp>

        <StaggerContainer>
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:gap-8">
            {services.map((service, index) => (
              <StaggerItem key={`${service.name}-${index}`}>
                <article
                  className={cx(CARD, SURFACE, 'group overflow-hidden')}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="relative m-2 h-64 overflow-hidden rounded-[24px] sm:h-72">
                    <MediaFill
                      src={service.image}
                      alt={mediaAlt(businessName, service.name)}
                      sizes="(min-width: 1280px) 40vw, (min-width: 768px) 45vw, 100vw"
                      className="transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,17,29,0.08)_0%,rgba(12,17,29,0.66)_100%)]" />
                    <div className="absolute left-5 top-5">
                      <span className={BADGE_DARK}>
                        {`${index + 1}`.padStart(2, '0')}
                      </span>
                    </div>
                    <div className="absolute bottom-5 left-5 right-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/75">
                        {service.name}
                      </p>
                      <p className="mt-2 font-heading text-2xl font-bold leading-tight text-white">
                        {service.description}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 sm:p-7">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="font-heading text-3xl font-bold tracking-[-0.04em] text-stone-950">
                        {service.name}
                      </h3>
                      <span className="text-sm uppercase tracking-[0.24em] text-stone-400">
                        Crafted
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-stone-700 sm:text-base">
                      {service.description}
                    </p>

                    <ul className="mt-6 space-y-3">
                      {service.features.map((feature) => (
                        <FeatureBullet key={feature}>{feature}</FeatureBullet>
                      ))}
                    </ul>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <Link href="/visualizer" className={BUTTON_PRIMARY}>
                        Plan This Renovation
                      </Link>
                      <Link
                        href="/visualizer?mode=chat"
                        className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-950 transition-colors duration-300 hover:text-primary"
                      >
                        Get a Quick Estimate
                      </Link>
                    </div>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </div>
        </StaggerContainer>
      </div>
    </section>
  );
}

export function AboutSection({
  branding,
  config,
  tokens,
  className,
}: SectionBaseProps) {
  void config;
  void tokens;

  const brand = asRecord(branding);
  const businessName = asText(brand["name"]) || 'Westmount Craftsmen';
  const phone = asText(brand["phone"]);

  return (
    <section
      id="about"
      className={cx(
        'relative overflow-hidden bg-stone-50 py-20 sm:py-24 lg:py-28',
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(26,115,232,0.1),transparent_28%),linear-gradient(180deg,#faf7f1_0%,#f4efe6_100%)]" />

      <div className={cx(SHELL, 'relative')}>
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-12">
          <FadeIn>
            <div>
              <SectionEyebrow>About Westmount Craftsmen</SectionEyebrow>
              <h2 className={cx(SECTION_TITLE, 'mt-5 max-w-2xl')}>
                Design decisions first. Construction confidence after.
              </h2>
              <p className={cx(BODY_COPY, 'mt-6 max-w-2xl')}>
                {businessHistory}
              </p>
              <p className={cx(BODY_COPY, 'mt-5 max-w-2xl')}>
                That approach matters most in lived-in homes, where layout,
                sightlines, circulation, storage, and durability all need to
                work together. The result is a renovation that looks calm on the
                surface because the thinking underneath was done properly.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link href="/visualizer" className={BUTTON_PRIMARY}>
                  See Your Space Before You Build
                </Link>
                {phone ? (
                  <a
                    href={`tel:${cleanPhone(phone)}`}
                    className={BUTTON_SECONDARY_LIGHT}
                  >
                    Talk to Our AI Receptionist
                  </a>
                ) : (
                  <Link
                    href="/visualizer?mode=chat"
                    className={BUTTON_SECONDARY_LIGHT}
                  >
                    Get a Quick Estimate
                  </Link>
                )}
              </div>

              <div className="mt-10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
                  Serving
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {serviceAreas.map((area) => (
                    <span key={area} className={BADGE}>
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>

          <SlideInFromSide>
            <div className="relative">
              <div
                className={cx(
                  CARD,
                  SURFACE,
                  'group relative min-h-[520px] overflow-hidden bg-stone-950',
                )}
              >
                <div className="absolute inset-0">
                  <MediaFill
                    src={aboutImage}
                    alt={mediaAlt(businessName, 'renovation team and finished space')}
                    sizes="(min-width: 1024px) 44vw, 100vw"
                    className="transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,17,29,0.12)_8%,rgba(12,17,29,0.82)_100%)]" />

                <div className="relative flex min-h-[520px] flex-col justify-between p-6 sm:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <span className={BADGE_DARK}>Front-end design led</span>
                    <div className="rounded-[28px] border border-white/15 bg-white/10 px-4 py-3 text-right backdrop-blur">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                        Local Focus
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/80">
                        Kitchener Waterloo renovations with a highly personal
                        planning process.
                      </p>
                    </div>
                  </div>

                  <div className="max-w-md rounded-[28px] border border-white/15 bg-white/10 p-6 backdrop-blur">
                    <StarRow rating={testimonial.rating} />
                    <p className="mt-4 text-base leading-7 text-white/88">
                      “{testimonial.text}”
                    </p>
                    <div className="mt-5">
                      <p className="font-heading text-lg font-bold text-white">
                        {testimonial.author}
                      </p>
                      <p className="text-sm uppercase tracking-[0.2em] text-white/65">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SlideInFromSide>
        </div>

        <StaggerContainer>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {processSteps.map((step, index) => (
              <StaggerItem key={step.title}>
                <article
                  className={cx(CARD, SURFACE, 'p-6 sm:p-7')}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                      Step {index + 1}
                    </span>
                    <span className="text-sm uppercase tracking-[0.24em] text-stone-300">
                      Refined
                    </span>
                  </div>
                  <h3 className="mt-4 font-heading text-2xl font-bold tracking-[-0.04em] text-stone-950">
                    {step.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-stone-700 sm:text-base">
                    {step.description}
                  </p>
                </article>
              </StaggerItem>
            ))}
          </div>
        </StaggerContainer>
      </div>
    </section>
  );
}

export function Footer({
  branding,
  config,
  tokens,
  className,
}: SectionBaseProps) {
  void config;
  void tokens;

  const brand = asRecord(branding);
  const businessName = asText(brand["name"]) || 'Westmount Craftsmen';
  const phone = asText(brand["phone"]);
  const email = asText(brand["email"]);
  const address = asText(brand["address"]);
  const logo =
    asText(brand["logo_url"]) || asText(brand["logoUrl"]) || asText(brand["logo"]);
  const monogram = firstWords(businessName, 2)
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const footerLinks = [
    { label: 'Home', href: '#hero' },
    { label: 'Services', href: '#services' },
    { label: 'About', href: '#about' },
    { label: 'Projects', href: '#gallery' },
    { label: 'Why Choose Us', href: '#why-us' },
  ];
  const connectLinks = socialLinks.length
    ? socialLinks
    : [
        { label: 'Design Studio', href: '/visualizer' },
        { label: 'Quick Estimate', href: '/visualizer?mode=chat' },
        ...(phone ? [{ label: 'Call', href: `tel:${cleanPhone(phone)}` }] : []),
      ];

  return (
    <footer
      id="footer"
      className={cx('relative overflow-hidden bg-stone-950 text-white', className)}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(26,115,232,0.42),transparent_28%),linear-gradient(135deg,#0f172a_0%,#18202d_42%,#121212_100%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:120px_120px]" />

      <div className={cx(SHELL, 'relative py-20 sm:py-24')}>
        <FadeIn>
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.7fr_0.8fr_0.8fr]">
            <div>
              <SectionEyebrow>Westmount Craftsmen</SectionEyebrow>

              <div className="mt-6 flex items-center gap-4">
                <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10 text-lg font-bold uppercase tracking-[0.28em] text-white">
                  {logo ? (
                    <Image
                      src={logo}
                      alt={businessName}
                      fill
                      sizes="64px"
                      className="object-contain p-3"
                    />
                  ) : (
                    <span>{monogram}</span>
                  )}
                </div>
                <div>
                  <p className="font-heading text-2xl font-bold tracking-[-0.04em] text-white">
                    {businessName}
                  </p>
                  <p className="mt-1 text-sm uppercase tracking-[0.2em] text-white/65">
                    Design-first renovations in Kitchener Waterloo
                  </p>
                </div>
              </div>

              <p className="mt-6 max-w-md text-sm leading-7 text-white/76 sm:text-base">
                Calm, well-planned renovations for homeowners who want more than
                a surface upgrade. Westmount Craftsmen helps shape better homes
                through up-front design thinking and careful execution.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link href="/visualizer" className={BUTTON_PRIMARY}>
                  See Your Space Before You Build
                </Link>
                <Link
                  href="/visualizer?mode=chat"
                  className={BUTTON_SECONDARY_DARK}
                >
                  Get a Quick Estimate
                </Link>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                Navigation
              </p>
              <nav className="mt-5 flex flex-col gap-4">
                {footerLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-sm uppercase tracking-[0.2em] text-white/80 transition-colors duration-300 hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                Contact
              </p>
              <div className="mt-5 flex flex-col gap-4">
                {phone ? (
                  <ContactLink href={`tel:${cleanPhone(phone)}`} label={phone} />
                ) : null}
                {email ? (
                  <ContactLink href={`mailto:${email}`} label={email} />
                ) : null}
                {address ? (
                  <p className="max-w-xs text-sm leading-7 text-white/76">
                    {address}
                  </p>
                ) : (
                  <p className="max-w-xs text-sm leading-7 text-white/76">
                    Serving {serviceAreas.join(', ')} with family-owned
                    renovation planning and construction.
                  </p>
                )}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                Connect
              </p>
              <div className="mt-5 flex flex-col gap-4">
                {connectLinks.map((link) => (
                  <ContactLink
                    key={`${link.label}-${link.href}`}
                    href={link.href}
                    label={link.label}
                  />
                ))}
              </div>
              <div className="mt-8 rounded-[28px] border border-white/12 bg-white/10 p-5 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                  Local Reach
                </p>
                <p className="mt-3 text-sm leading-7 text-white/76">
                  {serviceAreas.slice(0, 4).join(' • ')}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-white/62 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 {businessName}. All rights reserved.</p>
            <p>Renovations made easy, because the design work gets done first.</p>
          </div>
        </FadeIn>
      </div>
    </footer>
  );
}

export function ProjectGallery({
  branding,
  config,
  tokens,
  className,
}: SectionBaseProps) {
  void config;
  void tokens;

  const businessName = asText(asRecord(branding)["name"]) || 'Westmount Craftsmen';

  return (
    <section
      id="gallery"
      className={cx('relative overflow-hidden bg-white py-20 sm:py-24 lg:py-28', className)}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#fbfaf6_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(26,115,232,0.06),transparent_22%)]" />

      <div className={cx(SHELL, 'relative')}>
        <FadeInUp>
          <div className="mx-auto max-w-3xl text-center">
            <SectionEyebrow>Project Gallery</SectionEyebrow>
            <h2 className={cx(SECTION_TITLE, 'mt-5')}>
              Finished spaces with clarity, warmth, and better flow.
            </h2>
            <p className={cx(BODY_COPY, 'mx-auto mt-6 max-w-2xl')}>
              The portfolio is where Westmount Craftsmen’s design-first approach
              shows up clearly: layouts breathe more easily, finishes feel
              resolved, and everyday spaces begin working harder without looking
              overworked.
            </p>
          </div>
        </FadeInUp>

        <StaggerContainer>
          <div className="mt-12 grid auto-rows-[260px] gap-6 md:grid-cols-2 xl:grid-cols-12">
            {projects.map((project, index) => (
              <StaggerItem key={`${project.title}-${index}`}>
                <ScaleIn>
                  <article
                    className={cx(
                      CARD,
                      'group relative isolate h-full overflow-hidden bg-stone-950 text-white',
                      GALLERY_SPANS[index] ?? 'xl:col-span-4',
                    )}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="absolute inset-0">
                      <MediaFill
                        src={project.image}
                        alt={mediaAlt(businessName, project.title)}
                        sizes="(min-width: 1280px) 32vw, (min-width: 768px) 50vw, 100vw"
                        className="transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,17,29,0.08)_0%,rgba(12,17,29,0.78)_100%)]" />

                    <div className="relative flex h-full flex-col justify-between p-6 sm:p-7">
                      <div className="flex items-start justify-between gap-4">
                        <span className={BADGE_DARK}>{project.category}</span>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/65">
                          {project.location}
                        </span>
                      </div>

                      <div className="max-w-sm">
                        <h3 className="font-heading text-lg font-bold leading-snug tracking-[-0.03em] text-white line-clamp-3 sm:text-xl">
                          {project.title}
                        </h3>
                        <p className="mt-3 text-sm leading-7 text-white/76">
                          A renovation shaped around how the home feels, moves,
                          and supports everyday life.
                        </p>
                      </div>
                    </div>
                  </article>
                </ScaleIn>
              </StaggerItem>
            ))}
          </div>
        </StaggerContainer>

        <FadeIn>
          <div
            className={cx(
              CARD,
              SURFACE,
              'mt-12 overflow-hidden bg-stone-50 p-7 sm:p-8 lg:flex lg:items-end lg:justify-between lg:gap-10',
            )}
          >
            <div className="max-w-3xl">
              <SectionEyebrow>Bring Your Own Home Into Focus</SectionEyebrow>
              <p className="mt-4 font-heading text-3xl font-bold tracking-[-0.04em] text-stone-950 sm:text-4xl">
                Upload a photo, explore renovation directions, and arrive at the
                first conversation with sharper instincts.
              </p>
              <p className="mt-4 text-sm leading-7 text-stone-700 sm:text-base">
                The design studio extends the same clarity Westmount Craftsmen
                brings to planning: less guesswork, faster comparison, and a
                better sense of what the next move should be.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row lg:mt-0">
              <Link href="/visualizer" className={BUTTON_PRIMARY}>
                See Your Space Before You Build
              </Link>
              <Link
                href="/visualizer?mode=chat"
                className={BUTTON_SECONDARY_LIGHT}
              >
                Get a Quick Estimate
              </Link>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

export function WhyChooseUs({
  branding,
  config,
  tokens,
  className,
}: SectionBaseProps) {
  void config;
  void tokens;

  const businessName = asText(asRecord(branding)["name"]) || 'Westmount Craftsmen';

  const advantageCards = [
    {
      index: '01',
      title: 'Planning gets real before construction starts',
      description:
        processSteps[0]?.description ||
        'Westmount Craftsmen invests in the front-end design phase so major decisions are handled before momentum turns expensive.',
    },
    {
      index: '02',
      title: 'Layouts are shaped around how your household lives',
      description:
        processSteps[1]?.description ||
        'The design is built around daily friction points, routines, storage demands, and the feeling each room should create.',
    },
    {
      index: '03',
      title: 'Family-owned accountability stays close to the work',
      description:
        'You are not passed through a faceless system. Communication stays direct, thoughtful, and tied to the people doing the work.',
    },
    {
      index: '04',
      title: 'Finished spaces are meant to age well',
      description:
        processSteps[2]?.description ||
        'Materials, detailing, and construction choices are considered with long-term use in mind, not just launch-day impressions.',
    },
  ];

  const aiSteps = [
    {
      label: '01',
      title: 'Upload a photo of the room you want to rethink',
      description:
        'Show the current condition first so the design conversation starts from your real constraints.',
    },
    {
      label: '02',
      title: 'Review tailored renovation concepts in minutes',
      description:
        'Compare directions quickly and decide what feels worth exploring before the full planning conversation.',
    },
    {
      label: '03',
      title: 'Use chat to shape budget and project fit',
      description:
        'Move from inspiration into practical next steps without losing the visual momentum.',
    },
  ];

  return (
    <section
      id="why-us"
      className={cx(
        'relative overflow-hidden bg-stone-50 py-20 sm:py-24 lg:py-28',
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(26,115,232,0.12),transparent_30%),linear-gradient(180deg,#f8f5ef_0%,#f2ece0_100%)]" />

      <div className={cx(SHELL, 'relative')}>
        <FadeInUp>
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <SectionEyebrow>Why Choose Us</SectionEyebrow>
              <h2 className={cx(SECTION_TITLE, 'mt-5 max-w-2xl')}>
                A renovation partner that treats design as part of the build.
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {trustHighlights.map((highlight) => (
                <div key={highlight.label} className={cx(CARD, SURFACE, 'p-5')}>
                  <p className="font-heading text-3xl font-black tracking-[-0.04em] text-stone-950">
                    {highlight.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-stone-700">
                    {highlight.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </FadeInUp>

        <div className="mt-12 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <StaggerContainer>
            <div className="grid gap-6 md:grid-cols-2">
              {advantageCards.map((card, index) => (
                <StaggerItem key={card.title}>
                  <article
                    className={cx(CARD, SURFACE, 'p-6 sm:p-7')}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-bold uppercase tracking-[0.2em] text-primary">
                        {card.index}
                      </span>
                      <span className="text-sm uppercase tracking-[0.24em] text-stone-300">
                        {businessName}
                      </span>
                    </div>
                    <h3 className="mt-5 font-heading text-2xl font-bold tracking-[-0.04em] text-stone-950">
                      {card.title}
                    </h3>
                    <p className="mt-4 text-sm leading-7 text-stone-700 sm:text-base">
                      {card.description}
                    </p>
                  </article>
                </StaggerItem>
              ))}
            </div>
          </StaggerContainer>

          <SlideInFromSide>
            <div className="relative overflow-hidden rounded-[28px] border border-stone-900/10 bg-stone-950 p-7 text-white shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(26,115,232,0.38),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0)_100%)]" />
              <div className="relative">
                <SectionEyebrow>How It Works</SectionEyebrow>
                <h3 className="mt-5 font-heading text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl">
                  Start the renovation conversation with something more useful
                  than a blank inquiry form.
                </h3>
                <p className="mt-4 max-w-xl text-sm leading-7 text-white/76 sm:text-base">
                  Westmount Craftsmen now pairs design-led renovation planning
                  with an AI-powered design studio. It helps homeowners get
                  visual clarity faster, while still keeping the final build
                  grounded in practical craftsmanship.
                </p>

                <div className="mt-8 grid gap-4">
                  {aiSteps.map((step, index) => (
                    <div
                      key={step.title}
                      className={cx(CARD_DARK, 'p-5')}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-start gap-4">
                        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm font-bold uppercase tracking-[0.2em] text-primary">
                          {step.label}
                        </span>
                        <div>
                          <h4 className="font-heading text-xl font-bold tracking-[-0.03em] text-white">
                            {step.title}
                          </h4>
                          <p className="mt-2 text-sm leading-7 text-white/72">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <Link href="/visualizer" className={BUTTON_PRIMARY}>
                    See Your Space Before You Build
                  </Link>
                  <Link
                    href="/visualizer?mode=chat"
                    className={BUTTON_SECONDARY_DARK}
                  >
                    Get a Quick Estimate
                  </Link>
                </div>
              </div>
            </div>
          </SlideInFromSide>
        </div>
      </div>
    </section>
  );
}
