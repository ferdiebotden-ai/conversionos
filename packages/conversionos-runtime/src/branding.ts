/**
 * Branding helpers for multi-tenant UI.
 * Server-side: reads admin_settings from Supabase.
 * Client-side: use the BrandingProvider context instead.
 */

import { createServiceClient } from './db/server';
import { getSiteIdAsync } from './db/site';

export interface Branding {
  name: string;
  tagline: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  province: string;
  postal: string;
  socials: { label: string; href: string }[];
  paymentEmail: string;
  quotesEmail: string;
  primaryColor: string;
  primaryOklch: string;
  logoUrl?: string | undefined;
  logoOnDark?: boolean | undefined;
  faviconUrl?: string | undefined;
  ogImageUrl?: string | undefined;
  services: { name: string; slug: string }[];
  navItems?: { label: string; href: string }[] | undefined;
}

const DEMO_BRANDING: Branding = {
  name: 'ConversionOS Demo',
  tagline: 'AI-Powered Renovation Platform',
  phone: '(226) 444-3478',
  email: 'ferdie@norbotsystems.com',
  website: 'conversionos-demo.norbotsystems.com',
  address: '1 Ontario Street',
  city: 'Stratford',
  province: 'ON',
  postal: 'N5A 3H1',
  socials: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/norbot-systems' },
    { label: 'GitHub', href: 'https://github.com/norbot-systems' },
  ],
  paymentEmail: 'ferdie@norbotsystems.com',
  quotesEmail: 'ferdie@norbotsystems.com',
  primaryColor: '#0D9488',
  primaryOklch: '0.588 0.108 180',
  logoUrl: '/brand/logo-full/norbot-full-teal.svg',
  services: [],
};

/**
 * Fetch branding for the current tenant (server-side only).
 * Falls back to generic demo branding if admin_settings is empty.
 */
export async function getBranding(): Promise<Branding> {
  try {
    const supabase = createServiceClient();
    const siteId = await getSiteIdAsync();

    const { data } = await supabase
      .from('admin_settings')
      .select('key, value')
      .eq('site_id', siteId)
      .in('key', ['business_info', 'branding', 'company_profile']);

    if (!data || data.length === 0) return DEMO_BRANDING;

    const map = Object.fromEntries(data.map((r) => [r.key, r.value]));

    // Defensive parse — guard against double-serialized JSON strings in Supabase
    function ensureObj(val: unknown): Record<string, unknown> {
      if (typeof val === 'string') {
        try { return JSON.parse(val) as Record<string, unknown>; } catch { return {}; }
      }
      return (val as Record<string, unknown>) ?? {};
    }

    const info = ensureObj(map['business_info']);
    const brand = ensureObj(map['branding']);
    const profile = ensureObj(map['company_profile']);

    const colors = (brand['colors'] as Record<string, string>) || {};
    const rawServices = (profile['services'] as { name: string; slug?: string }[]) || [];

    return {
      name: (info['name'] as string) || DEMO_BRANDING.name,
      tagline: (brand['tagline'] as string) || (info['tagline'] as string) || DEMO_BRANDING.tagline,
      phone: (info['phone'] as string) || '',
      email: (info['email'] as string) || '',
      website: (info['website'] as string) || DEMO_BRANDING.website,
      address: (info['address'] as string) ?? DEMO_BRANDING.address,
      city: (info['city'] as string) || DEMO_BRANDING.city,
      province: (info['province'] as string) || DEMO_BRANDING.province,
      postal: (info['postal'] as string) ?? '',
      socials: (brand['socials'] as Branding['socials']) || DEMO_BRANDING.socials,
      paymentEmail: (info['payment_email'] as string) || '',
      quotesEmail: (info['quotes_email'] as string) || '',
      primaryColor: colors['primary_hex'] || DEMO_BRANDING.primaryColor,
      primaryOklch: colors['primary_oklch'] || DEMO_BRANDING.primaryOklch,
      logoUrl: (profile['logoUrl'] as string) || (brand['logoUrl'] as string) || undefined,
      logoOnDark: (brand['logoOnDark'] as boolean) || undefined,
      faviconUrl: (brand['faviconUrl'] as string) || undefined,
      ogImageUrl: (brand['ogImageUrl'] as string) || undefined,
      services: rawServices.map(s => ({
        name: s.name,
        slug: s.slug || s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      })),
      navItems: (brand['navItems'] as Branding['navItems']) || undefined,
    };
  } catch {
    return DEMO_BRANDING;
  }
}

export { DEMO_BRANDING };
