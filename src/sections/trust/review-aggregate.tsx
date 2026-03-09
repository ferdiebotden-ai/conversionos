'use client';

import { Star } from 'lucide-react';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { FadeInUp } from '@/components/motion';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

function StarDisplay({ rating }: { rating: number }) {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.25 && rating - fullStars < 0.75;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      // Full star
      stars.push(
        <Star
          key={i}
          className="size-7 fill-yellow-400 text-yellow-400 md:size-8"
        />
      );
    } else if (i === fullStars && hasHalf) {
      // Half star — render as full with reduced opacity for simplicity
      stars.push(
        <Star
          key={i}
          className="size-7 fill-yellow-400/60 text-yellow-400 md:size-8"
        />
      );
    } else {
      // Empty star
      stars.push(
        <Star
          key={i}
          className="size-7 text-muted-foreground/30 md:size-8"
        />
      );
    }
  }

  return <div className="flex items-center gap-1">{stars}</div>;
}

export function TrustReviewAggregate({ branding, config, className }: Props) {
  const rating = config.trustMetrics?.google_rating;
  if (!rating) return null;

  const numericRating = parseFloat(rating);
  if (isNaN(numericRating)) return null;

  return (
    <FadeInUp>
      <section
        className={`py-12 md:py-16 ${className ?? ''}`}
      >
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-md rounded-2xl bg-muted/30 px-8 py-10 text-center">
            <div className="flex justify-center">
              <StarDisplay rating={numericRating} />
            </div>

            <div className="mt-4 text-4xl font-bold text-foreground md:text-5xl">
              {rating}
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              out of 5 on Google Reviews
            </p>

            <p className="mt-4 text-sm text-muted-foreground">
              See why homeowners trust {branding.name} for their renovation projects.
            </p>
          </div>
        </div>
      </section>
    </FadeInUp>
  );
}
