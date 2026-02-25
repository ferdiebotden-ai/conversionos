import { describe, it, expect } from 'vitest';
import {
  hasQuotes,
  getHeaderCTA,
  getMobileCTA,
  getHowItWorksSubtitle,
  getDefaultProcessStep3,
  getHomepageFinalCTA,
  getHomepageTeaser,
  getEstimateCTA,
  getContactAlternativeCTA,
  getContactMetaDescription,
  getServicesCTA,
  getServiceDetailCTA,
  getProjectsCTA,
  getAboutCTA,
  getNotFoundCTA,
  getVisualizerResultCTA,
  getVisualizerShareCTA,
  getChatWelcome,
  getChatHandoffWelcome,
  getChatSkipText,
  type CopyContext,
} from '@/lib/copy/site-copy';

// Helper — all 7 meaningful combos
const combos: { label: string; ctx: CopyContext; quotesOn: boolean }[] = [
  { label: 'Elevate + none', ctx: { tier: 'elevate', quoteMode: 'none' }, quotesOn: false },
  { label: 'Accelerate + none', ctx: { tier: 'accelerate', quoteMode: 'none' }, quotesOn: false },
  { label: 'Accelerate + range', ctx: { tier: 'accelerate', quoteMode: 'range' }, quotesOn: true },
  { label: 'Accelerate + estimate', ctx: { tier: 'accelerate', quoteMode: 'estimate' }, quotesOn: true },
  { label: 'Dominate + none', ctx: { tier: 'dominate', quoteMode: 'none' }, quotesOn: false },
  { label: 'Dominate + range', ctx: { tier: 'dominate', quoteMode: 'range' }, quotesOn: true },
  { label: 'Dominate + estimate', ctx: { tier: 'dominate', quoteMode: 'estimate' }, quotesOn: true },
];

describe('hasQuotes', () => {
  it.each(combos)('$label → $quotesOn', ({ ctx, quotesOn }) => {
    expect(hasQuotes(ctx)).toBe(quotesOn);
  });
});

describe('getHeaderCTA', () => {
  it.each(combos)('$label', ({ ctx, quotesOn }) => {
    const cta = getHeaderCTA(ctx);
    if (quotesOn) {
      expect(cta.href).toBe('/estimate');
      expect(cta.label).toContain('Quote');
    } else {
      expect(cta.href).toBe('/contact');
      expect(cta.label).toContain('Contact');
    }
  });
});

describe('getMobileCTA', () => {
  it.each(combos)('$label', ({ ctx, quotesOn }) => {
    const cta = getMobileCTA(ctx);
    if (quotesOn) {
      expect(cta.href).toBe('/estimate');
    } else {
      expect(cta.href).toBe('/contact');
    }
  });
});

describe('getHowItWorksSubtitle', () => {
  it('mentions estimate when quotes on', () => {
    expect(getHowItWorksSubtitle({ tier: 'accelerate', quoteMode: 'range' })).toContain('estimate');
  });
  it('says consultation when quotes off', () => {
    expect(getHowItWorksSubtitle({ tier: 'elevate', quoteMode: 'none' })).toContain('consultation');
  });
});

describe('getDefaultProcessStep3', () => {
  it('says Receive Your Estimate when quotes on', () => {
    const step = getDefaultProcessStep3({ tier: 'dominate', quoteMode: 'range' });
    expect(step.title).toContain('Estimate');
  });
  it('says Connect with a Pro when quotes off', () => {
    const step = getDefaultProcessStep3({ tier: 'elevate', quoteMode: 'none' });
    expect(step.title).toContain('Connect');
  });
});

describe('getHomepageFinalCTA', () => {
  it('links to /estimate when quotes on', () => {
    const cta = getHomepageFinalCTA({ tier: 'accelerate', quoteMode: 'estimate' });
    expect(cta.secondaryHref).toBe('/estimate');
  });
  it('links to /contact when quotes off', () => {
    const cta = getHomepageFinalCTA({ tier: 'accelerate', quoteMode: 'none' });
    expect(cta.secondaryHref).toBe('/contact');
  });
});

describe('getHomepageTeaser', () => {
  it('mentions estimate when quotes on', () => {
    expect(getHomepageTeaser({ tier: 'dominate', quoteMode: 'range' })).toContain('estimate');
  });
  it('does not mention estimate when quotes off', () => {
    expect(getHomepageTeaser({ tier: 'elevate', quoteMode: 'none' })).not.toContain('estimate');
  });
});

describe('getEstimateCTA', () => {
  it('routes to /estimate when quotes on', () => {
    expect(getEstimateCTA({ tier: 'accelerate', quoteMode: 'range' }).href).toBe('/estimate');
  });
  it('routes to /contact when quotes off', () => {
    expect(getEstimateCTA({ tier: 'elevate', quoteMode: 'none' }).href).toBe('/contact');
  });
});

describe('getContactAlternativeCTA', () => {
  it('returns content when quotes on', () => {
    const result = getContactAlternativeCTA({ tier: 'accelerate', quoteMode: 'range' });
    expect(result).not.toBeNull();
    expect(result!.linkHref).toBe('/estimate');
  });
  it('returns null when quotes off (Elevate)', () => {
    expect(getContactAlternativeCTA({ tier: 'elevate', quoteMode: 'none' })).toBeNull();
  });
  it('returns null when Accelerate mode=none', () => {
    expect(getContactAlternativeCTA({ tier: 'accelerate', quoteMode: 'none' })).toBeNull();
  });
});

describe('getContactMetaDescription', () => {
  const branding = { name: 'TestCo', city: 'Toronto', province: 'Ontario' };
  it('mentions quote when quotes on', () => {
    const desc = getContactMetaDescription({ tier: 'dominate', quoteMode: 'estimate' }, branding);
    expect(desc).toContain('quote');
  });
  it('omits quote when quotes off', () => {
    const desc = getContactMetaDescription({ tier: 'elevate', quoteMode: 'none' }, branding);
    expect(desc).not.toContain('quote');
  });
});

describe('getServicesCTA', () => {
  it('primary goes to /estimate when quotes on', () => {
    const cta = getServicesCTA({ tier: 'accelerate', quoteMode: 'range' });
    expect(cta.primary.href).toBe('/estimate');
  });
  it('primary goes to /contact when quotes off', () => {
    const cta = getServicesCTA({ tier: 'dominate', quoteMode: 'none' });
    expect(cta.primary.href).toBe('/contact');
  });
});

describe('getServiceDetailCTA', () => {
  it('links to /estimate with slug when quotes on', () => {
    const cta = getServiceDetailCTA({ tier: 'accelerate', quoteMode: 'range' }, 'kitchen');
    expect(cta.primary.href).toBe('/estimate?service=kitchen');
  });
  it('links to /contact when quotes off', () => {
    const cta = getServiceDetailCTA({ tier: 'elevate', quoteMode: 'none' }, 'kitchen');
    expect(cta.primary.href).toBe('/contact');
  });
});

describe('getProjectsCTA', () => {
  it('primary goes to /estimate when quotes on', () => {
    expect(getProjectsCTA({ tier: 'accelerate', quoteMode: 'range' }).primary.href).toBe('/estimate');
  });
  it('primary goes to /contact when quotes off', () => {
    expect(getProjectsCTA({ tier: 'elevate', quoteMode: 'none' }).primary.href).toBe('/contact');
  });
});

describe('getAboutCTA', () => {
  it('primary goes to /estimate when quotes on', () => {
    expect(getAboutCTA({ tier: 'dominate', quoteMode: 'range' }).primary.href).toBe('/estimate');
  });
  it('primary goes to /contact when quotes off', () => {
    expect(getAboutCTA({ tier: 'accelerate', quoteMode: 'none' }).primary.href).toBe('/contact');
  });
});

describe('getNotFoundCTA', () => {
  it('goes to /estimate when quotes on', () => {
    expect(getNotFoundCTA({ tier: 'accelerate', quoteMode: 'range' }).href).toBe('/estimate');
  });
  it('goes to /contact when quotes off', () => {
    expect(getNotFoundCTA({ tier: 'elevate', quoteMode: 'none' }).href).toBe('/contact');
  });
});

describe('getVisualizerResultCTA', () => {
  it('says Personalised Estimate when quotes on', () => {
    const cta = getVisualizerResultCTA({ tier: 'accelerate', quoteMode: 'range' }, 'TestCo');
    expect(cta.label).toContain('Estimate');
    expect(cta.icon).toBe('message');
  });
  it('says Request a Callback when quotes off', () => {
    const cta = getVisualizerResultCTA({ tier: 'accelerate', quoteMode: 'none' }, 'TestCo');
    expect(cta.label).toContain('Callback');
    expect(cta.label).toContain('TestCo');
    expect(cta.icon).toBe('phone');
  });
});

describe('getVisualizerShareCTA', () => {
  const branding = { name: 'TestCo', city: 'Toronto', province: 'Ontario' };
  it('links to /estimate when quotes on', () => {
    const cta = getVisualizerShareCTA({ tier: 'dominate', quoteMode: 'range' }, branding);
    expect(cta.headerCTA.href).toBe('/estimate');
    expect(cta.primaryCTA.href).toBe('/estimate');
    expect(cta.description).toContain('quote');
  });
  it('links to /contact when quotes off', () => {
    const cta = getVisualizerShareCTA({ tier: 'dominate', quoteMode: 'none' }, branding);
    expect(cta.headerCTA.href).toBe('/contact');
    expect(cta.primaryCTA.href).toBe('/contact');
    expect(cta.description).not.toContain('quote');
  });
});

describe('getChatWelcome', () => {
  it('mentions cost when quotes on', () => {
    const msg = getChatWelcome({ tier: 'accelerate', quoteMode: 'range' }, 'TestCo', 'Toronto', 'Ontario');
    expect(msg).toContain('cost');
  });
  it('does not mention cost when quotes off', () => {
    const msg = getChatWelcome({ tier: 'accelerate', quoteMode: 'none' }, 'TestCo', 'Toronto', 'Ontario');
    expect(msg).not.toContain('cost');
  });
});

describe('getChatHandoffWelcome', () => {
  it('mentions estimate when quotes on', () => {
    const msg = getChatHandoffWelcome(
      { tier: 'accelerate', quoteMode: 'range' },
      'TestCo', 'kitchen', ' in a modern style', '', undefined,
    );
    expect(msg).toContain('estimate');
  });
  it('does not mention estimate when quotes off', () => {
    const msg = getChatHandoffWelcome(
      { tier: 'accelerate', quoteMode: 'none' },
      'TestCo', 'kitchen', ' in a modern style', '', undefined,
    );
    expect(msg).not.toContain('estimate');
  });
});

describe('getChatSkipText', () => {
  it('mentions quote when quotes on', () => {
    expect(getChatSkipText({ tier: 'accelerate', quoteMode: 'range' })).toContain('quote');
  });
  it('does not mention quote when quotes off', () => {
    expect(getChatSkipText({ tier: 'accelerate', quoteMode: 'none' })).not.toContain('quote');
  });
});
