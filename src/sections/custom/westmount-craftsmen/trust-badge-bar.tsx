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

import Image from 'next/image';
import Link from 'next/link';
import type { SectionBaseProps } from '@/lib/section-types';

type DataRecord = Record<string, unknown>;
type TrustIndicator = { label: string; value: string };

function asRecord(value: unknown): DataRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as DataRecord) : null;
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function pickNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const normalized = Number(value.replace(/[^0-9.]/g, ''));
      if (Number.isFinite(normalized) && normalized > 0) return normalized;
    }
  }
  return null;
}

function pickImageUrl(...values: unknown[]): string | null {
  for (const value of values) {
    if (!value) continue;
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (Array.isArray(value)) {
      const nested = pickImageUrl(...value);
      if (nested) return nested;
      continue;
    }

    const record = asRecord(value);
    if (!record) continue;

    const nested = pickImageUrl(
      record['url'],
      record['src'],
      record['path'],
      record['storageUrl'],
      record['storage_url'],
      record['image'],
      record['imageUrl'],
      record['image_url'],
    );

    if (nested) return nested;
  }

  return null;
}

function splitIndicators(indicators: TrustIndicator[]) {
  const midpoint = Math.ceil(indicators.length / 2);
  return [indicators.slice(0, midpoint), indicators.slice(midpoint)] as const;
}

function pickRecordValues(record: DataRecord | null, keys: string[]): unknown[] {
  return keys.map((key) => record?.[key]);
}

export function TrustBadgeBar({ branding, config, tokens, className }: SectionBaseProps) {
  void tokens;

  const configRecord = asRecord(config);
  const companyProfile = asRecord(configRecord?.['company_profile']) ?? asRecord(configRecord?.['companyProfile']);
  const brandName = pickString(branding.name, configRecord?.['businessName'], companyProfile?.['name']) ?? 'Westmount Craftsmen';

  const badgeUrl = pickImageUrl(
    ...pickRecordValues(configRecord, [
      'trustBadgeImage',
      'trust_badge_image',
      'trustBadge',
      'trustBadges',
      'badge',
      'badges',
    ]),
    ...pickRecordValues(companyProfile, [
      'trustBadgeImage',
      'trust_badge_image',
      'chamberBadge',
      'chamber_badge',
    ]),
  );

  const yearsInBusiness = pickNumber(
    ...pickRecordValues(companyProfile, ['yearsInBusiness', 'years_in_business']),
    ...pickRecordValues(configRecord, ['yearsInBusiness', 'years_in_business']),
  );
  const foundedYear = pickNumber(
    ...pickRecordValues(companyProfile, [
      'foundedYear',
      'founded_year',
      'establishedYear',
      'established_year',
    ]),
    ...pickRecordValues(configRecord, ['foundedYear', 'founded_year']),
  );
  const derivedYears = yearsInBusiness ?? (foundedYear ? Math.max(new Date().getFullYear() - foundedYear, 0) : null);
  const googleRating = pickNumber(
    ...pickRecordValues(companyProfile, ['googleRating', 'google_rating']),
    ...pickRecordValues(configRecord, ['googleRating', 'google_rating']),
  );
  const reviewCount = pickNumber(
    ...pickRecordValues(companyProfile, [
      'googleReviews',
      'google_reviews',
      'reviewCount',
      'review_count',
    ]),
    ...pickRecordValues(configRecord, ['googleReviews', 'google_reviews']),
  );

  const trustIndicators: TrustIndicator[] = [];

  if (!badgeUrl) {
    trustIndicators.push({ label: 'Member', value: 'Kitchener-Waterloo Chamber of Commerce' });
  }

  if (derivedYears && derivedYears > 0) {
    trustIndicators.push({ label: 'Experience', value: `${Math.round(derivedYears)}+ years in business` });
  }

  if (googleRating) {
    trustIndicators.push({
      label: 'Google',
      value: `${googleRating.toFixed(1)}★${reviewCount ? ` · ${Math.round(reviewCount)} reviews` : ''}`,
    });
  }

  if (!badgeUrl && trustIndicators.length === 0) return null;

  const [leftIndicators, rightIndicators] = splitIndicators(trustIndicators);
  const badgeAlt = `${brandName} Kitchener-Waterloo Chamber of Commerce membership badge`;
  const rootClassName = `bg-[#f8f8f8] bg-[oklch(var(--base,98%_0_0))] py-6 ${className ?? ''}`.trim();

  return (
    <section aria-label={`${brandName} trust bar`} className={rootClassName}>
      <Link
        href="/visualizer"
        className="sr-only rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:absolute focus:right-4 focus:top-4 focus:ring-2 focus:ring-primary"
      >
        Get Your Free Design Estimate
      </Link>

      <div className="mx-auto flex max-w-[1700px] flex-col items-center justify-center gap-6 px-4 md:flex-row md:gap-12 md:px-6">
        {badgeUrl && leftIndicators.length > 0 ? (
          <nav aria-label="Trust indicators" className="hidden flex-1 items-center justify-end gap-12 md:flex">
            {leftIndicators.map((indicator) => (
              <article key={indicator.label} className="min-w-[180px] text-center md:text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{indicator.label}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{indicator.value}</p>
              </article>
            ))}
          </nav>
        ) : (
          <div aria-hidden="true" className="hidden flex-1 md:block" />
        )}

        <article className="flex w-full max-w-[520px] shrink-0 flex-col items-center justify-center">
          {badgeUrl ? (
            <Image
              alt={badgeAlt}
              className="h-auto max-h-20 w-auto max-w-full object-contain"
              height={227}
              loader={({ src }) => src}
              priority
              sizes="(max-width: 768px) 85vw, 520px"
              src={badgeUrl}
              unoptimized
              width={1196}
            />
          ) : (
            <nav aria-label="Trust indicators" className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-center">
              {trustIndicators.map((indicator) => (
                <article key={indicator.label} className="min-w-[180px]">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{indicator.label}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{indicator.value}</p>
                </article>
              ))}
            </nav>
          )}

          {badgeUrl && trustIndicators.length > 0 ? (
            <nav aria-label="Trust indicators" className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-center md:hidden">
              {trustIndicators.map((indicator) => (
                <article key={indicator.label} className="min-w-[160px]">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{indicator.label}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{indicator.value}</p>
                </article>
              ))}
            </nav>
          ) : null}
        </article>

        {badgeUrl && rightIndicators.length > 0 ? (
          <nav aria-label="Trust indicators" className="hidden flex-1 items-center justify-start gap-12 md:flex">
            {rightIndicators.map((indicator) => (
              <article key={indicator.label} className="min-w-[180px] text-center md:text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{indicator.label}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{indicator.value}</p>
              </article>
            ))}
          </nav>
        ) : (
          <div aria-hidden="true" className="hidden flex-1 md:block" />
        )}
      </div>
    </section>
  );
}
