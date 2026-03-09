/**
 * Section Catalogue Generator
 * Reads section IDs from the register.ts file (parse, not import — runs outside Next.js)
 * and generates a structured catalogue for the Opus Vision blueprint generator.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTER_PATH = resolve(__dirname, '../../../src/sections/register.ts');
const OUTPUT_PATH = resolve(__dirname, '../../data/section-catalogue.json');

/** Category descriptions for AI context */
const CATEGORY_DESCRIPTIONS = {
  hero: 'Full-viewport hero banner at the top of a page',
  nav: 'Navigation bar / header',
  services: 'Service offering showcase grid or list',
  trust: 'Trust signals — ratings, badges, certifications, stats',
  testimonials: 'Customer testimonial displays',
  gallery: 'Project portfolio / image gallery',
  about: 'About the company — team, values, story',
  contact: 'Contact forms and information',
  cta: 'Call-to-action sections',
  footer: 'Page footer with links and contact info',
  misc: 'Miscellaneous sections — FAQ, process steps, maps, partner logos, visualizer teaser',
};

/**
 * Parse register.ts to extract section registrations.
 * Looks for lines matching: ['category:variant', ComponentName],
 */
export function parseSectionRegistry() {
  const source = readFileSync(REGISTER_PATH, 'utf-8');
  const sections = [];

  // Match patterns like: ['hero:full-bleed-overlay', FullBleedOverlayHero],
  const regex = /\['([^']+)',\s*(\w+)\]/g;
  let match;
  while ((match = regex.exec(source)) !== null) {
    const id = match[1];
    const componentName = match[2];
    const [category, variant] = id.split(':');

    sections.push({
      id,
      category,
      variant,
      componentName,
      description: `${CATEGORY_DESCRIPTIONS[category] || category} — ${variant.replace(/-/g, ' ')} variant`,
    });
  }

  return sections;
}

/**
 * Generate section catalogue JSON file.
 */
export function generateCatalogue() {
  const sections = parseSectionRegistry();

  const catalogue = {
    generated: new Date().toISOString(),
    totalSections: sections.length,
    categories: Object.fromEntries(
      Object.entries(CATEGORY_DESCRIPTIONS).map(([cat, desc]) => [
        cat,
        {
          description: desc,
          sections: sections.filter(s => s.category === cat),
        },
      ])
    ),
    allSectionIds: sections.map(s => s.id),
  };

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(catalogue, null, 2));
  console.log(`Section catalogue generated: ${sections.length} sections → ${OUTPUT_PATH}`);
  return catalogue;
}

// Run if called directly
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  generateCatalogue();
}
