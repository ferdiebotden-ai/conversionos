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
  if (hasQuotes(ctx)) return { label: 'Get Quote', href: '/visualizer' };
  return { label: 'Contact Us', href: '/contact' };
}

// ---------------------------------------------------------------------------
// Mobile CTA bar
// ---------------------------------------------------------------------------

export function getMobileCTA(ctx: CopyContext): CTACopy {
  if (hasQuotes(ctx)) return { label: 'Get Estimate', href: '/visualizer' };
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
// Homepage — process step 3, always overrides DB/fallback step 3
// Step 3 is inherently about the next action (estimate vs contact) so it
// MUST adapt to quoteMode regardless of what the DB stores.
// ---------------------------------------------------------------------------

export function getDefaultProcessStep3(ctx: CopyContext, companyName?: string): {
  title: string;
  description: string;
} {
  const name = companyName || 'a qualified local contractor';
  if (hasQuotes(ctx)) {
    return {
      title: 'Receive Your Estimate',
      description: `Get a detailed cost range based on Ontario pricing data, then connect with ${name} to bring it to life.`,
    };
  }
  return {
    title: 'Connect with a Pro',
    description: `Love what you see? Get in touch with ${name} to discuss your project and bring it to life.`,
  };
}

// ---------------------------------------------------------------------------
// Homepage — final CTA section
// ---------------------------------------------------------------------------

export function getHomepageFinalCTA(ctx: CopyContext): {
  description: string;
  secondaryLabel: string;
  secondaryHref: string;
  chatLabel: string;
  chatHref: string;
} {
  if (hasQuotes(ctx)) {
    return {
      description:
        'Upload a photo. Get AI design concepts. Receive a ballpark estimate. All in minutes, all free.',
      secondaryLabel: 'Or get a free estimate',
      secondaryHref: '/visualizer',
      chatLabel: 'No photo? Just chat with Emma',
      chatHref: '/visualizer?mode=chat',
    };
  }
  return {
    description:
      'Upload a photo. Get AI design concepts. Connect with us to bring it to life.',
    secondaryLabel: 'Or contact us directly',
    secondaryHref: '/contact',
    chatLabel: 'No photo? Just chat with Emma',
    chatHref: '/visualizer?mode=chat',
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
  if (hasQuotes(ctx)) return { label: 'Get a Free Estimate', href: '/visualizer' };
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
    linkHref: '/visualizer',
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
      primary: { label: 'Get Instant Quote', href: '/visualizer' },
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
      primary: { label: 'Get a Quote', href: '/visualizer' },
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
      primary: { label: 'Get a Free Quote', href: '/visualizer' },
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
  if (hasQuotes(ctx)) return { label: 'Get a Quote', href: '/visualizer' };
  return { label: 'Contact Us', href: '/contact' };
}

// ---------------------------------------------------------------------------
// Visualizer result page — primary CTA button
// ---------------------------------------------------------------------------

export function getVisualizerResultCTA(
  ctx: CopyContext,
  companyName: string,
): { label: string; icon: 'message' | 'phone' } {
  if (hasQuotes(ctx)) return { label: 'Get a Personalised Estimate', icon: 'message' };
  return { label: `Request a Callback from ${companyName}`, icon: 'phone' };
}

// ---------------------------------------------------------------------------
// Visualizer share page — header + CTA section
// ---------------------------------------------------------------------------

export function getVisualizerShareCTA(ctx: CopyContext, branding: {
  name: string;
  city: string;
  province: string;
}): {
  headerCTA: CTACopy;
  heading: string;
  description: string;
  primaryCTA: CTACopy;
} {
  if (hasQuotes(ctx)) {
    return {
      headerCTA: { label: 'Get a Quote', href: '/visualizer' },
      heading: 'Love This Design?',
      description: `Get a personalized quote for your renovation project from the experts at ${branding.name} in ${branding.city}, ${branding.province}.`,
      primaryCTA: { label: 'Get a Quote for This Design', href: '/visualizer' },
    };
  }
  return {
    headerCTA: { label: 'Contact Us', href: '/contact' },
    heading: 'Love This Design?',
    description: `Get in touch with the experts at ${branding.name} in ${branding.city}, ${branding.province} to discuss this renovation project.`,
    primaryCTA: { label: 'Discuss This Design', href: '/contact' },
  };
}

// ---------------------------------------------------------------------------
// Visualizer — skip photo link text
// ---------------------------------------------------------------------------

export function getSkipPhotoText(ctx: CopyContext): string {
  if (hasQuotes(ctx)) return "Don\u2019t have a photo? Tell us about your project for a quick estimate";
  return "Don\u2019t have a photo? Tell us about your project instead";
}

// ---------------------------------------------------------------------------
// Chat interface — welcome message (estimate page)
// ---------------------------------------------------------------------------

export function getChatWelcome(
  ctx: CopyContext,
  companyName: string,
  city: string,
  province: string,
): string {
  if (hasQuotes(ctx)) {
    return `Hey there! I'm Emma, your renovation assistant here at ${companyName}. I help homeowners in the ${city}, ${province} area understand what their renovation will cost — no surprises, no pressure.\n\nTell me about the space you're thinking of renovating, or snap a quick photo and I'll take a look!`;
  }
  return `Hey there! I'm Emma, your renovation assistant here at ${companyName}. I help homeowners in the ${city}, ${province} area plan their renovation projects — from design ideas to finding the right contractor.\n\nTell me about the space you're thinking of renovating, or snap a quick photo and I'll take a look!`;
}

// ---------------------------------------------------------------------------
// Chat interface — visualizer handoff welcome
// ---------------------------------------------------------------------------

export function getChatHandoffWelcome(
  ctx: CopyContext,
  companyName: string,
  roomLabel: string,
  styleNote: string,
  conceptNote: string,
  dimensionsNote?: string | undefined,
): string {
  const greeting = `Hey there! I see you've been exploring a ${roomLabel} renovation${styleNote}.${conceptNote}\n\nI'm Emma, your renovation assistant here at ${companyName}.`;

  if (hasQuotes(ctx)) {
    const followUp = dimensionsNote
      ? `\n\nI can see from the analysis that the space is approximately ${dimensionsNote.replace(/\.+$/, '')}. When are you hoping to start this project, and do you have a budget range in mind?`
      : `\n\nTo get you an accurate estimate, could you tell me about the size of the space and when you're hoping to start?`;
    return `${greeting} Let's turn that vision into real numbers.${followUp}`;
  }
  const followUp = `\n\nWhen are you hoping to start this project? I can help connect you with the right contractor.`;
  return `${greeting} Let's turn that vision into reality.${followUp}`;
}

// ---------------------------------------------------------------------------
// Chat — "skip the chat" helper text
// ---------------------------------------------------------------------------

export function getChatSkipText(ctx: CopyContext, companyName?: string): string {
  const name = companyName || 'a team member';
  if (hasQuotes(ctx)) return 'In a hurry? Skip the chat and get your quote within 24 hours.';
  return `In a hurry? Skip the chat and ${name} will be in touch within 24 hours.`;
}
