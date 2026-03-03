/**
 * ContractorWebsiteSchema — Zod schema for structured data extraction.
 * Used with FireCrawl /extract endpoint.
 */

import { z } from 'zod';

export const ContractorWebsiteSchema = z.object({
  // Business identity
  business_name: z.string().describe('The company/business name'),
  tagline: z.string().optional().describe('Company tagline or slogan'),
  hero_headline: z.string().optional().describe('Main headline text on the homepage hero section'),
  hero_subheadline: z.string().optional().describe('Company tagline or core values statement — short phrase (5-12 words). Examples: "Quality, Integrity, Service", "Excellence, Integrity, Dependability". Only extract if explicitly stated on the website.'),

  // Contact info
  phone: z.string().optional().describe('Primary phone number'),
  email: z.string().optional().describe('Primary email address'),
  address: z.string().optional().describe('Street address'),
  city: z.string().optional().describe('City'),
  province: z.string().optional().describe('Province/state (e.g., ON, BC)'),
  postal: z.string().optional().describe('Postal/zip code'),
  website: z.string().optional().describe('Website URL'),

  // Social and booking
  social_facebook: z.string().optional().describe('Facebook page URL'),
  social_instagram: z.string().optional().describe('Instagram profile URL'),
  social_houzz: z.string().optional().describe('Houzz profile URL'),
  social_google: z.string().optional().describe('Google Business URL'),
  social_twitter: z.string().optional().describe('X/Twitter profile URL'),
  social_linkedin: z.string().optional().describe('LinkedIn company page URL'),
  social_youtube: z.string().optional().describe('YouTube channel URL'),
  social_tiktok: z.string().optional().describe('TikTok profile URL'),
  social_pinterest: z.string().optional().describe('Pinterest profile URL'),
  booking_url: z.string().optional().describe('Online booking/scheduling URL'),

  // Brand
  primary_color_hex: z.string().optional().describe('Primary brand colour as hex code (e.g., #D60000)'),
  logo_url: z.string().optional().describe('URL of the company logo image'),
  hero_image_url: z.string().optional().describe('URL of the homepage hero/banner image'),
  about_image_url: z.string().optional().describe('URL of the about section image'),

  // Company details
  principals: z.string().optional().describe('Owner/founder name(s)'),
  founded_year: z.string().optional().describe('Year the company was founded'),
  service_area: z.string().optional().describe('Geographic service area description'),
  certifications: z.array(z.string()).optional().describe('List of certifications and memberships'),
  about_copy: z.array(z.string()).optional().describe('About section paragraphs'),
  mission: z.string().optional().describe('Mission statement'),
  business_hours: z.string().optional().describe('Business hours (e.g., Mon-Fri 8am-5pm)'),

  // Team
  team_members: z.array(z.object({
    name: z.string(),
    role: z.string().optional(),
    photo_url: z.string().optional(),
    bio: z.string().optional(),
  })).optional().describe('Team member profiles'),

  // Services
  services: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    features: z.array(z.string()).optional(),
    packages: z.array(z.object({
      name: z.string(),
      starting_price: z.string().optional(),
      description: z.string().optional(),
    })).optional(),
    image_urls: z.array(z.string()).optional(),
  })).optional().describe('List of services offered'),

  // Testimonials
  testimonials: z.array(z.object({
    author: z.string(),
    quote: z.string(),
    project_type: z.string().optional(),
    rating: z.number().optional(),
    platform: z.string().optional().describe('Source platform (Google, Houzz, etc.)'),
  })).optional().describe('Customer testimonials/reviews'),

  // Portfolio
  portfolio: z.array(z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    image_url: z.string(),
    service_type: z.string().optional(),
    location: z.string().optional(),
  })).optional().describe('Portfolio/project gallery images'),

  // Additional content
  trust_badges: z.array(z.object({
    label: z.string(),
  })).optional().describe('Trust indicators, certifications shown prominently'),
  why_choose_us: z.array(z.object({
    title: z.string(),
    description: z.string(),
  })).optional().describe('Why choose us / advantages section'),
  process_steps: z.array(z.object({
    title: z.string(),
    description: z.string(),
  })).optional().describe('Service process steps'),
  values: z.array(z.object({
    title: z.string(),
    description: z.string(),
  })).optional().describe('Company values'),
});

export const ScrapedTenantSchema = ContractorWebsiteSchema.extend({
  _meta: z.object({
    source_url: z.string(),
    scraped_at: z.string(),
    firecrawl_credits_used: z.number().optional(),
    primary_oklch: z.string().optional(),
  }).optional(),
});
