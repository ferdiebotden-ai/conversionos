/**
 * Company Knowledge Base
 * Dynamic company information for all AI agent personas.
 * Reads from admin_settings at runtime via getBranding().
 *
 * For static contexts where async isn't available, use the
 * DEFAULT_COMPANY_PROFILE / DEFAULT_COMPANY_SUMMARY exports
 * which are populated from admin_settings during SSR.
 */

import { createServiceClient } from '@/lib/db/server';
import { getSiteId } from '@/lib/db/site';

export interface CompanyConfig {
  name: string;
  location: string;
  phone: string;
  email: string;
  website: string;
  principals: string;
  tagline: string;
  founded: string;
  booking: string;
  serviceArea: string;
  certifications: string[];
  socials: { platform: string; url: string }[];
  // Extended fields for templates, pages, and AI prompts
  paymentEmail: string;
  quotesEmail: string;
  address: string;
  city: string;
  province: string;
  postal: string;
  hours: string;
  primaryColor: string;
  primaryOklch: string;
  testimonials: { author: string; quote: string; projectType: string }[];
  aboutCopy: string[];
  mission: string;
  services: {
    name: string;
    slug: string;
    description: string;
    features?: string[];
    packages?: { name: string; startingPrice?: string; description?: string }[];
    imageUrl?: string;
    iconHint?: string;
  }[];
  // Extended content fields for DB-driven pages
  heroHeadline: string;
  heroSubheadline: string;
  heroImageUrl: string;
  aboutImageUrl: string;
  logoUrl: string;
  trustBadges: { label: string; iconHint: string }[];
  whyChooseUs: { title: string; description: string }[];
  values: { title: string; description: string; iconHint: string }[];
  processSteps: { title: string; description: string }[];
  teamMembers: { name: string; role: string; photoUrl: string; bio?: string }[];
  portfolio: { title: string; description: string; imageUrl: string; serviceType: string; location: string }[];
}

/**
 * Fetch company config from admin_settings.
 * Falls back to minimal defaults if DB is unavailable.
 */
export async function getCompanyConfig(): Promise<CompanyConfig> {
  try {
    const supabase = createServiceClient();
    const siteId = getSiteId();

    const { data } = await supabase
      .from('admin_settings')
      .select('key, value')
      .eq('site_id', siteId)
      .in('key', ['business_info', 'branding', 'company_profile']);

    if (!data || data.length === 0) return FALLBACK_CONFIG;

    const map = Object.fromEntries(data.map((r) => [r.key, r.value]));
    const info = (map['business_info'] ?? {}) as Record<string, unknown>;
    const profile = (map['company_profile'] ?? {}) as Record<string, unknown>;
    const brand = (map['branding'] ?? {}) as Record<string, unknown>;

    const city = (info['city'] as string) || FALLBACK_CONFIG.city;
    const province = (info['province'] as string) || FALLBACK_CONFIG.province;
    const colors = (brand['colors'] as Record<string, string>) || {};

    return {
      name: (info['name'] as string) || FALLBACK_CONFIG.name,
      location: `${city}, ${province}, Canada`,
      phone: (info['phone'] as string) || FALLBACK_CONFIG.phone,
      email: (info['email'] as string) || FALLBACK_CONFIG.email,
      website: (info['website'] as string) || FALLBACK_CONFIG.website,
      principals: (profile['principals'] as string) || FALLBACK_CONFIG.principals,
      tagline: (brand['tagline'] as string) || (info['tagline'] as string) || FALLBACK_CONFIG.tagline,
      founded: (profile['founded'] as string) || FALLBACK_CONFIG.founded,
      booking: (profile['booking'] as string) || FALLBACK_CONFIG.booking,
      serviceArea: (profile['serviceArea'] as string) || FALLBACK_CONFIG.serviceArea,
      certifications: (profile['certifications'] as string[]) || FALLBACK_CONFIG.certifications,
      socials: (brand['socials'] as CompanyConfig['socials']) || FALLBACK_CONFIG.socials,
      paymentEmail: (info['payment_email'] as string) || FALLBACK_CONFIG.paymentEmail,
      quotesEmail: (info['quotes_email'] as string) || FALLBACK_CONFIG.quotesEmail,
      address: (info['address'] as string) || FALLBACK_CONFIG.address,
      city,
      province,
      postal: (info['postal'] as string) || FALLBACK_CONFIG.postal,
      hours: (profile['hours'] as string) || FALLBACK_CONFIG.hours,
      primaryColor: colors['primary_hex'] || FALLBACK_CONFIG.primaryColor,
      primaryOklch: colors['primary_oklch'] || FALLBACK_CONFIG.primaryOklch,
      testimonials: (profile['testimonials'] as CompanyConfig['testimonials']) || FALLBACK_CONFIG.testimonials,
      aboutCopy: (profile['aboutCopy'] as string[]) || FALLBACK_CONFIG.aboutCopy,
      mission: (profile['mission'] as string) || FALLBACK_CONFIG.mission,
      services: ((profile['services'] as CompanyConfig['services']) || FALLBACK_CONFIG.services).map(s => ({
        ...s,
        slug: s.slug || s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      })),
      heroHeadline: (profile['heroHeadline'] as string) || FALLBACK_CONFIG.heroHeadline,
      heroSubheadline: (profile['heroSubheadline'] as string) || FALLBACK_CONFIG.heroSubheadline,
      heroImageUrl: (profile['heroImageUrl'] as string) || FALLBACK_CONFIG.heroImageUrl,
      aboutImageUrl: (profile['aboutImageUrl'] as string) || FALLBACK_CONFIG.aboutImageUrl,
      logoUrl: (profile['logoUrl'] as string) || FALLBACK_CONFIG.logoUrl,
      trustBadges: (profile['trustBadges'] as CompanyConfig['trustBadges']) || FALLBACK_CONFIG.trustBadges,
      whyChooseUs: (profile['whyChooseUs'] as CompanyConfig['whyChooseUs']) || FALLBACK_CONFIG.whyChooseUs,
      values: (profile['values'] as CompanyConfig['values']) || FALLBACK_CONFIG.values,
      processSteps: (profile['processSteps'] as CompanyConfig['processSteps']) || FALLBACK_CONFIG.processSteps,
      teamMembers: (profile['teamMembers'] as CompanyConfig['teamMembers']) || FALLBACK_CONFIG.teamMembers,
      portfolio: (profile['portfolio'] as CompanyConfig['portfolio']) || FALLBACK_CONFIG.portfolio,
    };
  } catch {
    return FALLBACK_CONFIG;
  }
}

const FALLBACK_CONFIG: CompanyConfig = {
  name: 'AI Reno Demo',
  location: 'London, ON, Canada',
  phone: '(555) 000-0000',
  email: 'demo@example.com',
  website: 'ai-reno-demo.vercel.app',
  principals: 'the team',
  tagline: 'Smart Renovations',
  founded: '2024',
  booking: '',
  serviceArea: 'London, ON and surrounding communities',
  certifications: [],
  socials: [],
  paymentEmail: 'payments@example.com',
  quotesEmail: 'quotes@example.com',
  address: '123 Demo Street',
  city: 'London',
  province: 'ON',
  postal: 'N6A 1A1',
  hours: 'Mon-Fri 9am-5pm',
  primaryColor: '#1565C0',
  primaryOklch: '0.45 0.18 250',
  testimonials: [],
  aboutCopy: [],
  mission: '',
  services: [
    { name: 'Kitchen Renovation', slug: 'kitchen-renovation', description: 'Custom kitchen design and renovation' },
    { name: 'Bathroom Renovation', slug: 'bathroom-renovation', description: 'Full bathroom remodels' },
    { name: 'Basement Finishing', slug: 'basement-finishing', description: 'Unfinished to entertainment-ready' },
    { name: 'Flooring', slug: 'flooring', description: 'Hardwood, vinyl plank, tile installation' },
  ],
  heroHeadline: '',
  heroSubheadline: '',
  heroImageUrl: '',
  aboutImageUrl: '',
  logoUrl: '',
  trustBadges: [],
  whyChooseUs: [],
  values: [],
  processSteps: [],
  teamMembers: [],
  portfolio: [],
};

/**
 * Build the company profile prompt from config.
 */
export function buildCompanyProfile(config: CompanyConfig): string {
  let profile = `## Company Profile
- Name: ${config.name}
- Location: ${config.location}
- Phone: ${config.phone}
- Email: ${config.email}
- Website: ${config.website}
- Principals: ${config.principals}
- Tagline: ${config.tagline}
- Founded: ${config.founded}`;

  if (config.booking) {
    profile += `\n- Booking: ${config.booking}`;
  }

  profile += `\n\n## Service Area\n${config.serviceArea}`;

  profile += `\n\n## Business Hours
Monday-Friday: 9:00 AM - 5:00 PM
Saturday: Closed
Sunday: Closed`;

  if (config.certifications.length > 0) {
    profile += `\n\n## Certifications & Memberships\n${config.certifications.map(c => `- ${c}`).join('\n')}`;
  }

  if (config.socials.length > 0) {
    profile += `\n\n## Social Media\n${config.socials.map(s => `- ${s.platform}: ${s.url}`).join('\n')}`;
  }

  profile += `\n\n## Website Pages
- /services — Overview of all renovation services`;
  for (const svc of config.services) {
    profile += `\n- /services/${svc.slug} — ${svc.name}`;
  }
  profile += `
- /estimate — AI-powered renovation cost estimator
- /visualizer — AI room visualization tool
- /projects — Portfolio of completed work
- /about — Our story, team, and values
- /contact — Get in touch, request a callback`;

  return profile;
}

/**
 * Build the company summary from config.
 */
export function buildCompanySummary(config: CompanyConfig): string {
  const certs = config.certifications.length > 0
    ? ` Certified: ${config.certifications.join(', ')}.`
    : '';
  const booking = config.booking ? ` Booking: ${config.booking}` : '';

  return `${config.name} is a professional renovation company in ${config.location} run by ${config.principals}, founded in ${config.founded}. Phone: ${config.phone}. Email: ${config.email}. Tagline: "${config.tagline}".${certs}${booking}`;
}

// Legacy exports for sync contexts — these use fallback values.
// Prefer getCompanyConfig() + buildCompanyProfile() for async contexts.
export const COMPANY_PROFILE = buildCompanyProfile(FALLBACK_CONFIG);
export const COMPANY_SUMMARY = buildCompanySummary(FALLBACK_CONFIG);
