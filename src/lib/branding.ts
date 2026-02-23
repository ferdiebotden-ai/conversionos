/**
 * Branding helpers for multi-tenant UI.
 * Server-side: reads admin_settings from Supabase.
 * Client-side: use the BrandingProvider context instead.
 */

import { createServiceClient } from '@/lib/db/server';
import { getSiteIdAsync } from '@/lib/db/site';

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
  services: { name: string; slug: string }[];
}

const DEMO_BRANDING: Branding = {
  name: 'AI Reno Demo',
  tagline: 'Smart Renovations',
  phone: '(555) 000-0000',
  email: 'demo@example.com',
  website: 'ai-reno-demo.vercel.app',
  address: '123 Demo Street',
  city: 'London',
  province: 'ON',
  postal: 'N6A 1A1',
  socials: [],
  paymentEmail: 'payments@example.com',
  quotesEmail: 'quotes@example.com',
  primaryColor: '#1565C0',
  primaryOklch: '0.45 0.18 250',
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

    const info = (map['business_info'] ?? {}) as Record<string, unknown>;
    const brand = (map['branding'] ?? {}) as Record<string, unknown>;
    const profile = (map['company_profile'] ?? {}) as Record<string, unknown>;

    const colors = (brand['colors'] as Record<string, string>) || {};
    const rawServices = (profile['services'] as { name: string; slug?: string }[]) || [];

    return {
      name: (info['name'] as string) || DEMO_BRANDING.name,
      tagline: (brand['tagline'] as string) || (info['tagline'] as string) || DEMO_BRANDING.tagline,
      phone: (info['phone'] as string) || DEMO_BRANDING.phone,
      email: (info['email'] as string) || DEMO_BRANDING.email,
      website: (info['website'] as string) || DEMO_BRANDING.website,
      address: (info['address'] as string) || DEMO_BRANDING.address,
      city: (info['city'] as string) || DEMO_BRANDING.city,
      province: (info['province'] as string) || DEMO_BRANDING.province,
      postal: (info['postal'] as string) || DEMO_BRANDING.postal,
      socials: (brand['socials'] as Branding['socials']) || DEMO_BRANDING.socials,
      paymentEmail: (info['payment_email'] as string) || DEMO_BRANDING.paymentEmail,
      quotesEmail: (info['quotes_email'] as string) || DEMO_BRANDING.quotesEmail,
      primaryColor: colors['primary_hex'] || DEMO_BRANDING.primaryColor,
      primaryOklch: colors['primary_oklch'] || DEMO_BRANDING.primaryOklch,
      services: rawServices.map(s => ({
        name: s.name,
        slug: s.slug || s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      })),
    };
  } catch {
    return DEMO_BRANDING;
  }
}

export { DEMO_BRANDING };
