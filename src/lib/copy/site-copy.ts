/**
 * Centralized Copy Registry
 * All tier + quote-mode adaptive copy in one place.
 * Pure module — no DB, no React. Importable from server and client.
 */

import { canAccess, type PlanTier } from '@/lib/entitlements';
import type { QuoteAssistanceMode } from '@/lib/quote-assistance';

export interface CopyContext {
  tier: PlanTier;
  quoteMode: QuoteAssistanceMode;
}

/** True when the tenant has the quote engine AND hasn't disabled pricing. */
export function hasQuotes(ctx: CopyContext): boolean {
  return canAccess(ctx.tier, 'ai_quote_engine') && ctx.quoteMode !== 'none';
}

// ---------------------------------------------------------------------------
// CTA types
// ---------------------------------------------------------------------------

interface CTACopy {
  label: string;
  href: string;
}

interface CTASectionCopy {
  heading: string;
  description: string;
  primary: CTACopy;
  secondary?: CTACopy | undefined;
}

// ---------------------------------------------------------------------------
// Header CTA (3 instances: mobile sheet, mobile right, desktop right)
// ---------------------------------------------------------------------------

export function getHeaderCTA(ctx: CopyContext): CTACopy {
  if (hasQuotes(ctx)) return { label: 'Get Quote', href: '/estimate' };
  return { label: 'Contact Us', href: '/contact' };
}

// ---------------------------------------------------------------------------
// Mobile CTA bar
// ---------------------------------------------------------------------------

export function getMobileCTA(ctx: CopyContext): CTACopy {
  if (hasQuotes(ctx)) return { label: 'Get Estimate', href: '/estimate' };
  return { label: 'Contact Us', href: '/contact' };
}

// ---------------------------------------------------------------------------
// Homepage — How It Works subtitle
// ---------------------------------------------------------------------------

export function getHowItWorksSubtitle(ctx: CopyContext): string {
  if (hasQuotes(ctx)) return 'From photo to estimate in three simple steps.';
  return 'From photo to consultation in three simple steps.';
}

// ---------------------------------------------------------------------------
// Homepage — default process step 3 (used when DB has no custom steps)
// ---------------------------------------------------------------------------

export function getDefaultProcessStep3(ctx: CopyContext): {
  title: string;
  description: string;
} {
  if (hasQuotes(ctx)) {
    return {
      title: 'Receive Your Estimate',
      description: 'Get a detailed cost range based on Ontario pricing data.',
    };
  }
  return {
    title: 'Connect with a Pro',
    description: 'Get in touch with us to discuss your project and next steps.',
  };
}

// ---------------------------------------------------------------------------
// Homepage — final CTA section
// ---------------------------------------------------------------------------

export function getHomepageFinalCTA(ctx: CopyContext): {
  description: string;
  secondaryLabel: string;
  secondaryHref: string;
} {
  if (hasQuotes(ctx)) {
    return {
      description:
        'Upload a photo. Get AI design concepts. Receive a ballpark estimate. All in minutes, all free.',
      secondaryLabel: 'Or get a free estimate',
      secondaryHref: '/estimate',
    };
  }
  return {
    description:
      'Upload a photo. Get AI design concepts. Connect with us to bring it to life.',
    secondaryLabel: 'Or contact us directly',
    secondaryHref: '/contact',
  };
}

// ---------------------------------------------------------------------------
// Chat widget teaser (homepage)
// ---------------------------------------------------------------------------

export function getHomepageTeaser(ctx: CopyContext): string {
  if (hasQuotes(ctx)) return 'Planning a renovation? Chat with me for a free estimate!';
  return 'Planning a renovation? I can help you get started!';
}

// ---------------------------------------------------------------------------
// Chat NLP fallback CTA for estimate keywords
// ---------------------------------------------------------------------------

export function getEstimateCTA(ctx: CopyContext): CTACopy {
  if (hasQuotes(ctx)) return { label: 'Get a Free Estimate', href: '/estimate' };
  return { label: 'Request a Callback', href: '/contact' };
}

// ---------------------------------------------------------------------------
// Contact page — "Prefer an Instant Quote?" section
// Returns null when quotes are off (section should be hidden)
// ---------------------------------------------------------------------------

export function getContactAlternativeCTA(
  ctx: CopyContext,
): { heading: string; description: string; linkLabel: string; linkHref: string } | null {
  if (!hasQuotes(ctx)) return null;
  return {
    heading: 'Prefer an Instant Quote?',
    description: 'Use our AI-powered estimator for a quick ballpark estimate.',
    linkLabel: 'Get an instant quote \u2192',
    linkHref: '/estimate',
  };
}

// ---------------------------------------------------------------------------
// Contact page — meta description
// ---------------------------------------------------------------------------

export function getContactMetaDescription(
  ctx: CopyContext,
  branding: { name: string; city: string; province: string },
): string {
  if (hasQuotes(ctx)) {
    return `Get in touch with ${branding.name}. Request a free quote or ask questions about your renovation project in ${branding.city}, ${branding.province}.`;
  }
  return `Get in touch with ${branding.name}. Ask questions about your renovation project in ${branding.city}, ${branding.province}.`;
}

// ---------------------------------------------------------------------------
// Services page — bottom CTA
// ---------------------------------------------------------------------------

export function getServicesCTA(ctx: CopyContext): CTASectionCopy {
  if (hasQuotes(ctx)) {
    return {
      heading: 'Ready to Start Your Project?',
      description:
        'Get a personalized quote in minutes with our AI-powered estimator, or contact us directly to discuss your renovation needs.',
      primary: { label: 'Get Instant Quote', href: '/estimate' },
      secondary: { label: 'Contact Us', href: '/contact' },
    };
  }
  return {
    heading: 'Ready to Start Your Project?',
    description:
      'Contact us to discuss your renovation needs and get a personalized consultation.',
    primary: { label: 'Contact Us', href: '/contact' },
    secondary: { label: 'Try Visualizer', href: '/visualizer' },
  };
}

// ---------------------------------------------------------------------------
// Service detail page — bottom CTA
// ---------------------------------------------------------------------------

export function getServiceDetailCTA(
  ctx: CopyContext,
  slug: string,
): CTASectionCopy {
  if (hasQuotes(ctx)) {
    return {
      heading: '',
      description: 'Get a personalized quote or visualize your space with our AI tools.',
      primary: { label: 'Get a Quote', href: `/estimate?service=${slug}` },
      secondary: { label: 'Try Visualizer', href: '/visualizer' },
    };
  }
  return {
    heading: '',
    description: 'Get in touch to discuss your project or visualize your space with our AI tools.',
    primary: { label: 'Contact Us', href: '/contact' },
    secondary: { label: 'Try Visualizer', href: '/visualizer' },
  };
}

// ---------------------------------------------------------------------------
// Projects page — bottom CTA
// ---------------------------------------------------------------------------

export function getProjectsCTA(ctx: CopyContext): CTASectionCopy {
  if (hasQuotes(ctx)) {
    return {
      heading: 'Ready to Start Your Project?',
      description:
        "Let's create something amazing together. Get a personalized quote and see what your renovation could look like.",
      primary: { label: 'Get a Quote', href: '/estimate' },
      secondary: { label: 'Try the Visualizer', href: '/visualizer' },
    };
  }
  return {
    heading: 'Ready to Start Your Project?',
    description:
      "Let's create something amazing together. Contact us to discuss your renovation.",
    primary: { label: 'Contact Us', href: '/contact' },
    secondary: { label: 'Try the Visualizer', href: '/visualizer' },
  };
}

// ---------------------------------------------------------------------------
// About page — bottom CTA
// ---------------------------------------------------------------------------

export function getAboutCTA(ctx: CopyContext): CTASectionCopy {
  if (hasQuotes(ctx)) {
    return {
      heading: "Let's Build Something Together",
      description:
        "Ready to start your renovation journey? We'd love to hear about your project and show you what's possible.",
      primary: { label: 'Get a Free Quote', href: '/estimate' },
      secondary: { label: 'Contact Us', href: '/contact' },
    };
  }
  return {
    heading: "Let's Build Something Together",
    description:
      "Ready to start your renovation journey? We'd love to hear about your project and show you what's possible.",
    primary: { label: 'Contact Us', href: '/contact' },
    secondary: { label: 'Try Visualizer', href: '/visualizer' },
  };
}

// ---------------------------------------------------------------------------
// 404 page — secondary CTA
// ---------------------------------------------------------------------------

export function getNotFoundCTA(ctx: CopyContext): CTACopy {
  if (hasQuotes(ctx)) return { label: 'Get a Quote', href: '/estimate' };
  return { label: 'Contact Us', href: '/contact' };
}
