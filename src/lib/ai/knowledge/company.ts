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
import { getSiteIdAsync } from '@/lib/db/site';

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
  trustMetrics: { google_rating?: string; projects_completed?: string; years_in_business?: string; licensed_insured?: boolean };
}

/**
 * Fetch company config from admin_settings.
 * Falls back to minimal defaults if DB is unavailable.
 */
export async function getCompanyConfig(): Promise<CompanyConfig> {
  try {
    const supabase = createServiceClient();
    const siteId = await getSiteIdAsync();

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
      socials: ((brand['socials'] || FALLBACK_CONFIG.socials) as Array<Record<string, string>>).map(s => ({
        platform: s['platform'] || s['label'] || '',
        url: s['url'] || s['href'] || '',
      })),
      paymentEmail: (info['payment_email'] as string) || FALLBACK_CONFIG.paymentEmail,
      quotesEmail: (info['quotes_email'] as string) || FALLBACK_CONFIG.quotesEmail,
      address: (info['address'] as string) || FALLBACK_CONFIG.address,
      city,
      province,
      postal: (info['postal'] as string) ?? '',
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
      trustMetrics: (profile['trustMetrics'] as CompanyConfig['trustMetrics']) || FALLBACK_CONFIG.trustMetrics,
    };
  } catch {
    return FALLBACK_CONFIG;
  }
}

const FALLBACK_CONFIG: CompanyConfig = {
  name: 'ConversionOS Demo',
  location: 'Stratford, ON, Canada',
  phone: '(226) 444-3478',
  email: 'ferdie@norbotsystems.com',
  website: 'conversionos-demo.norbotsystems.com',
  principals: 'NorBot Systems',
  tagline: 'AI-Powered Renovation Platform',
  founded: '2025',
  booking: '',
  serviceArea: 'Ontario — all regions',
  certifications: [],
  socials: [
    { platform: 'LinkedIn', url: 'https://www.linkedin.com/company/norbot-systems' },
    { platform: 'GitHub', url: 'https://github.com/norbot-systems' },
  ],
  paymentEmail: 'ferdie@norbotsystems.com',
  quotesEmail: 'ferdie@norbotsystems.com',
  address: '1 Ontario Street',
  city: 'Stratford',
  province: 'ON',
  postal: '',
  hours: 'Mon-Fri 9am-5pm',
  primaryColor: '#0D9488',
  primaryOklch: '0.588 0.108 180',
  testimonials: [
    { author: 'Sarah M., Kitchener', quote: 'I uploaded a photo of my dated kitchen and within minutes had four stunning design concepts. Being able to see the finished result in my own space made the whole planning process so much easier.', projectType: 'Kitchen Renovation' },
    { author: 'James & Linda R., London', quote: 'We could not decide between modern and farmhouse for our basement. The AI visualizer showed us both styles in our actual space. Saved us weeks of back-and-forth with designers.', projectType: 'Basement Finishing' },
    { author: 'Priya K., Hamilton', quote: 'As a first-time homeowner, I had no idea where to start with a bathroom reno. The AI visualizer let me see exactly what my space could look like before committing to anything. Incredibly helpful.', projectType: 'Bathroom Renovation' },
  ],
  aboutCopy: [
    'ConversionOS is an AI-powered platform that gives Ontario homeowners instant renovation visualizations. Upload a photo of your space, choose a style, and see your transformation in minutes — not days.',
    'Built by NorBot Systems in Stratford, Ontario, ConversionOS connects homeowners with qualified local contractors through intelligent matching and AI-generated design concepts that make the renovation journey easier from first idea to final build.',
  ],
  mission: 'Make renovation planning faster, more transparent, and more accessible for every Ontario homeowner.',
  services: [
    { name: 'Kitchen Renovation', slug: 'kitchen-renovation', description: 'From layout redesign to finish selection, visualize your dream kitchen with AI-generated concepts before calling a contractor.', iconHint: 'chef-hat' },
    { name: 'Bathroom Renovation', slug: 'bathroom-renovation', description: 'See spa-inspired, modern, or classic bathroom transformations applied to your actual space. Compare styles side-by-side.', iconHint: 'bath' },
    { name: 'Basement Finishing', slug: 'basement-finishing', description: 'Turn your unfinished basement into an entertainment hub, home office, or rental suite. AI shows you the possibilities.', iconHint: 'layers' },
    { name: 'Whole-Home Renovation', slug: 'whole-home-renovation', description: 'Planning a major transformation? Get room-by-room AI visualizations and a comprehensive overview for your entire project.', iconHint: 'home' },
  ],
  heroHeadline: 'See Your Renovation Before It Begins',
  heroSubheadline: 'Upload a photo of any room. Choose a style. See your renovation come to life with AI-generated design concepts — in minutes, not days.',
  heroImageUrl: '',
  aboutImageUrl: '',
  logoUrl: '/brand/logo-full/norbot-full-teal.svg',
  trustBadges: [
    { label: 'Ontario-Based', iconHint: 'map-pin' },
    { label: 'AI-Powered', iconHint: 'sparkles' },
    { label: 'Privacy-First', iconHint: 'shield' },
  ],
  whyChooseUs: [
    { title: 'AI-Powered Visualizations', description: 'See your renovation before it starts. Our AI analyses your photos and generates four unique design concepts in under a minute.' },
    { title: 'See Before You Build', description: 'Upload a photo of your space and watch AI transform it into four unique design concepts. Compare styles side-by-side before making any decisions.' },
    { title: 'Trusted Ontario Platform', description: 'Built in Stratford for Ontario homeowners. Regional building knowledge and connections to qualified contractors in your area.' },
  ],
  values: [],
  processSteps: [
    { title: 'Upload a Photo', description: 'Snap a picture of your room with your phone or upload an existing photo. Our AI analyses the space automatically.' },
    { title: 'Get AI Design Concepts', description: 'Choose a style and receive four unique AI-generated visualizations of your transformed space in under a minute.' },
    { title: 'Connect with a Pro', description: 'Love what you see? Get in touch with a qualified local contractor to discuss your project and bring it to life.' },
  ],
  teamMembers: [],
  portfolio: [],
  trustMetrics: {
    google_rating: '4.9',
    projects_completed: '50+',
    years_in_business: '1',
    licensed_insured: true,
  },
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
